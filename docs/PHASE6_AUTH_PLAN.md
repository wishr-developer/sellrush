# Phase 6: Auth / RLS / Fraud Safety - 実装計画

最終更新: 2025-12-02

## P6-1: ロール & 権限の棚卸し

### ユーザー種別 / ロール一覧

| ロール | 説明 | 保存場所 | 備考 |
|--------|------|---------|------|
| `creator` | クリエイター | `user_metadata.role` | 紹介リンク生成、売上確認 |
| `influencer` | インフルエンサー | `user_metadata.role` | creatorと同等の権限 |
| `brand` | ブランド | `user_metadata.role` | 商品管理、売上確認 |
| `company` | 企業 | `user_metadata.role` | brandと同等の権限 |
| `admin` | 管理者 | `user_metadata.role` または `profiles.role` | MFA必須、全データアクセス |
| `anonymous` / `guest` | 未認証ユーザー | - | 公開ページのみアクセス可能 |

**注意:**
- `profiles` テーブルは存在する場合のみ使用（後方互換性のため）
- 優先順位: `user_metadata.role` > `profiles.role`
- ロール未設定ユーザーは `creator` として扱う（後方互換性）

### アクセス権限マトリクス

| 画面 / 機能 | creator | influencer | brand | company | admin | guest |
|-----------|---------|-----------|-------|---------|-------|-------|
| **公開ページ** |
| `/` (LP) | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ |
| `/market` | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ |
| `/products` | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ |
| `/purchase` | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ |
| `/purchase/success` | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ |
| **クリエイター用** |
| `/dashboard` | ⭕ | ⭕ | ❌ | ❌ | ❌ | ❌ |
| `/dashboard/orders` | ⭕ | ⭕ | ❌ | ❌ | ❌ | ❌ |
| `/settings` | ⭕ | ⭕ | ❌ | ❌ | ❌ | ❌ |
| **ブランド用** |
| `/brand/dashboard` | ❌ | ❌ | ⭕ | ⭕ | ❌ | ❌ |
| `/brand/products` | ❌ | ❌ | ⭕ | ⭕ | ❌ | ❌ |
| `/brand/orders` | ❌ | ❌ | ⭕ | ⭕ | ❌ | ❌ |
| **管理者用** |
| `/admin` | ❌ | ❌ | ❌ | ❌ | ⭕ | ❌ |
| `/admin/orders` | ❌ | ❌ | ❌ | ❌ | ⭕ | ❌ |
| `/admin/payouts` | ❌ | ❌ | ❌ | ❌ | ⭕ | ❌ |
| `/admin/users` | ❌ | ❌ | ❌ | ❌ | ⭕ | ❌ |
| `/admin/fraud` | ❌ | ❌ | ❌ | ❌ | ⭕ | ❌ |
| **API Routes** |
| `POST /api/affiliate-links/create` | ⭕ | ⭕ | ❌ | ❌ | ❌ | ❌ |
| `POST /api/orders/create` | ⭕ | ⭕ | ❌ | ❌ | ❌ | ❌ |
| `GET /api/rankings` | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ |
| `POST /api/checkout/create` | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ | ⭕ |
| `POST /api/brand/products` | ❌ | ❌ | ⭕ | ⭕ | ❌ | ❌ |
| `GET /api/brand/products` | ❌ | ❌ | ⭕ | ⭕ | ❌ | ❌ |
| `POST /api/payouts/generate` | ❌ | ❌ | ❌ | ❌ | ⭕ | ❌ |
| `POST /api/invitations/send` | ❌ | ❌ | ❌ | ❌ | ⭕ | ❌ |
| `POST /api/fraud/detect` | ❌ | ❌ | ❌ | ❌ | ⭕ | ❌ (内部呼び出し可) |
| `GET /api/admin/users` | ❌ | ❌ | ❌ | ❌ | ⭕ | ❌ |
| `POST /api/stripe/webhook` | - | - | - | - | - | - (Webhook) |

**凡例:**
- ⭕: アクセス可能
- ❌: アクセス不可
- -: 該当なし（Webhookなど）

## P6-2: Supabase RLS ポリシーの確認とメモ化

### 既存のRLSポリシー

#### 1. `orders` テーブル

**ポリシー:**
- **Creator**: `creator_id = auth.uid()` の orders のみ SELECT / INSERT 可能
- **Brand**: 自分の商品（`owner_id = auth.uid()`）に紐づく orders のみ SELECT 可能
- **Admin**: 全 orders を SELECT 可能

**SQL例:**
```sql
-- Creator は自分の orders のみ SELECT 可能
CREATE POLICY "Creators can view their own orders"
  ON public.orders FOR SELECT
  USING (creator_id = auth.uid());

-- Brand は自分の商品に紐づく orders のみ SELECT 可能
CREATE POLICY "Brands can view orders for their products"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = orders.product_id
      AND products.owner_id = auth.uid()
    )
  );

-- Admin は全 orders を SELECT 可能
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
```

#### 2. `products` テーブル

**ポリシー:**
- **公開商品**: `status = 'active'` の商品は全員 SELECT 可能
- **Brand**: `owner_id = auth.uid()` かつ `role IN ('brand', 'company')` の商品のみ SELECT / INSERT / UPDATE 可能

**SQL例:**
```sql
-- Brand は自分の商品のみ SELECT 可能
CREATE POLICY "Brands can view their own products"
  ON public.products FOR SELECT
  USING (
    owner_id = auth.uid()
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('brand', 'company')
  );
```

#### 3. `payouts` テーブル

**ポリシー:**
- **Creator**: `creator_id = auth.uid()` の payouts のみ SELECT 可能
- **Brand**: `brand_id = auth.uid()` の payouts のみ SELECT 可能
- **Admin**: 全 payouts を SELECT / UPDATE 可能

**SQL例:**
```sql
-- Creator は自分の payouts のみ SELECT 可能
CREATE POLICY "Creators can view their own payouts"
  ON public.payouts FOR SELECT
  USING (creator_id = auth.uid());

-- Brand は自分の payouts のみ SELECT 可能
CREATE POLICY "Brands can view their own payouts"
  ON public.payouts FOR SELECT
  USING (brand_id = auth.uid());
```

#### 4. `affiliate_links` テーブル

**ポリシー:**
- **公開商品**: `status = 'active'` の商品の affiliate_links は全員 SELECT 可能
- **Creator**: `creator_id = auth.uid()` の affiliate_links のみ INSERT / SELECT 可能
- **Brand**: 自分の商品（`owner_id = auth.uid()`）の affiliate_links を SELECT 可能

#### 5. `fraud_flags` テーブル

**ポリシー:**
- **Admin**: 全 fraud_flags を SELECT / UPDATE 可能

**SQL例:**
```sql
-- Admin は全 fraud_flags を SELECT 可能
CREATE POLICY "Admins can view all fraud flags"
  ON public.fraud_flags FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
```

### RLS前提のまとめ

| テーブル | Creator | Brand | Admin | 備考 |
|---------|---------|-------|-------|------|
| `orders` | `creator_id = auth.uid()` | 自分の商品のorders | 全件 | RLS前提 |
| `products` | 公開商品のみ | `owner_id = auth.uid()` | 全件 | RLS前提 |
| `payouts` | `creator_id = auth.uid()` | `brand_id = auth.uid()` | 全件 | RLS前提 |
| `affiliate_links` | `creator_id = auth.uid()` | 自分の商品のlinks | 全件 | RLS前提 |
| `fraud_flags` | ❌ | ❌ | 全件 | RLS前提 |

## P6-3: API Route 側のロールチェック統一

### 現状のロールチェック状況

| API Route | 認証チェック | ロールチェック | 状態 |
|-----------|------------|--------------|------|
| `POST /api/affiliate-links/create` | ✅ | ✅ (creator/influencer) | 完了 |
| `POST /api/orders/create` | ✅ | ❌ | **要追加** |
| `GET /api/rankings` | ❌ | ❌ | **要追加** (認証推奨) |
| `POST /api/checkout/create` | ❌ | ❌ | **要検討** (公開API) |
| `POST /api/brand/products` | ✅ | ✅ (brand/company) | 完了 |
| `GET /api/brand/products` | ✅ | ✅ (brand/company) | 完了 |
| `POST /api/payouts/generate` | ✅ | ✅ (admin) | 完了 |
| `POST /api/invitations/send` | ✅ | ✅ (admin) | 完了 |
| `POST /api/fraud/detect` | ✅ | ✅ (admin/内部呼び出し) | 完了 |
| `GET /api/admin/users` | ✅ | ✅ (admin) | 完了 |
| `POST /api/stripe/webhook` | ✅ (署名検証) | - | 完了 |

### 改善方針

1. **`POST /api/orders/create`**: creator/influencer のみアクセス可能に
2. **`GET /api/rankings`**: 認証推奨（未認証でもアクセス可能だが、ログイン済みの場合は自分の順位も返す）
3. **`POST /api/checkout/create`**: 公開APIのまま（Stripe Checkoutは公開で問題ない）

## P6-4: Fraud Safety（簡易版）の導入

### 既存の実装

- `/api/fraud/detect` が既に存在
- `fraud_flags` テーブルが存在
- 検知ルール:
  - 自己購入検知: `creator_id === brand_id`
  - Burst orders検知: 同一creatorが5分以内に5件以上
  - Amount anomaly検知: 平均注文額の3倍以上

### 改善方針

1. **`src/lib/fraud-rules.ts` を作成**
   - ルールベースの検知ロジックを集約
   - テスト可能な形に

2. **orders テーブルへの統合**
   - `fraud_flag` / `fraud_reason` カラムを追加（将来のスキーマ変更案）
   - 現時点では `fraud_flags` テーブルを使用

3. **API Routeへの統合**
   - `/api/orders/create` に fraud detection を統合
   - `/api/checkout/create` の webhook 処理後に fraud detection を呼び出し

## P6-5: Brand / Creator それぞれのダッシュボードへの反映

### 実装方針

1. **Creator Dashboard (`/dashboard`)**
   - 自分の注文に不正疑いがある場合の警告を表示
   - `fraud_flags` テーブルから `creator_id = auth.uid()` かつ `reviewed = false` の件数を取得

2. **Brand Dashboard (`/brand/dashboard`)**
   - 自分の商品の注文に不正疑いがある場合の警告を表示
   - `fraud_flags` テーブルから自分の商品の注文に紐づく未レビューの件数を取得

3. **Alert コンポーネント**
   - Phase 4の `DashboardCard` の雰囲気に合わせる
   - 簡易デザインで構わない

## P6-6: ドキュメントと「これが仕様です」説明用のまとめ

### 実装ステップ

1. **P6-1**: ロール & 権限の棚卸し ✅
2. **P6-2**: Supabase RLS ポリシーの確認とメモ化 ✅
3. **P6-3**: API Route 側のロールチェック統一
4. **P6-4**: Fraud Safety（簡易版）の導入
5. **P6-5**: Brand / Creator それぞれのダッシュボードへの反映
6. **P6-6**: ドキュメントと「これが仕様です」説明用のまとめ

## 実装の優先順位

1. **P6-3** (最優先): API Route 側のロールチェック統一
2. **P6-4**: Fraud Safety（簡易版）の導入
3. **P6-5**: Brand / Creator それぞれのダッシュボードへの反映
4. **P6-6**: ドキュメントと「これが仕様です」説明用のまとめ

## 注意事項

- 既存の Phase 2-5 で導入済みのユーティリティを前提として設計
- 新しく追加・変更した箇所には「なぜそうしたか」が分かる1行コメントを日本語で残す
- RLS前提の明示を徹底する

