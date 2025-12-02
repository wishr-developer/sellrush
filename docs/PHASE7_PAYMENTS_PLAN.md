# Phase 7: 決済 / 報酬フロー (Stripe & Revenue Share) - 実装計画

最終更新: 2025-01-30

## 📋 目次

1. [P7-1: 決済フローとデータ構造の棚卸し](#p7-1-決済フローとデータ構造の棚卸し)
2. [P7-2: Revenue Share ロジックの共通化](#p7-2-revenue-share-ロジックの共通化)
3. [P7-3: Stripe Webhook と Orders の整合性チェック](#p7-3-stripe-webhook-と-orders-の整合性チェック)
4. [P7-4: Creator / Brand ダッシュボードとの金額整合性](#p7-4-creator--brand-ダッシュボードとの金額整合性)
5. [P7-5: 最低限のテストとサンドボックス動作確認](#p7-5-最低限のテストとサンドボックス動作確認)

---

## P7-1: 決済フローとデータ構造の棚卸し

### 既存の Stripe 関連コード

#### 1. API Routes

| ファイル | エンドポイント | 用途 | 実装状況 |
|---------|--------------|------|---------|
| `src/app/api/checkout/create/route.ts` | `POST /api/checkout/create` | Stripe Checkout Session 作成 | ✅ 実装済み |
| `src/app/api/stripe/webhook/route.ts` | `POST /api/stripe/webhook` | Stripe Webhook ハンドラー | ✅ 実装済み |

#### 2. フロントエンド

| ファイル | 用途 | 実装状況 |
|---------|------|---------|
| `src/app/purchase/page.tsx` | 商品購入ページ（Checkout Session 作成） | ✅ 実装済み |
| `src/app/purchase/success/page.tsx` | 購入成功ページ | ✅ 実装済み |

#### 3. Stripe API エンドポイント使用状況

| Stripe API | 使用箇所 | 用途 |
|-----------|---------|------|
| `stripe.checkout.sessions.create` | `/api/checkout/create` | Checkout Session 作成 |
| `stripe.webhooks.constructEvent` | `/api/stripe/webhook` | Webhook 署名検証 |
| `checkout.session.completed` | `/api/stripe/webhook` | 決済完了イベント処理 |

**未使用の Stripe API**:
- `payment_intent.*`: 現在は Checkout Session のみ使用
- `subscription.*`: サブスクリプション機能は未実装
- `payout.*`: Stripe Connect の Payout 機能は未実装（自前の `payouts` テーブルを使用）

### データ構造

#### 1. `orders` テーブル

| カラム | 型 | 説明 | 決済関連 |
|--------|---|------|---------|
| `id` | UUID | 注文ID | - |
| `product_id` | UUID | 商品ID | - |
| `product_name` | TEXT | 商品名（スナップショット） | - |
| `price` | INTEGER | 商品価格（スナップショット） | - |
| `amount` | INTEGER | 実際の決済金額（Stripe から取得） | ✅ |
| `creator_id` | UUID | Creator ID | - |
| `affiliate_link_id` | UUID | 紹介リンクID | - |
| `status` | TEXT | 注文ステータス（`completed`, `pending`, `cancelled`, `refunded`） | ✅ |
| `source` | TEXT | 注文ソース（`stripe`, `demo`） | ✅ |
| `payment_intent_id` | TEXT | Stripe Payment Intent ID | ✅ |
| `stripe_session_id` | TEXT | Stripe Checkout Session ID | ✅ |
| `created_at` | TIMESTAMP | 作成日時 | - |
| `updated_at` | TIMESTAMP | 更新日時 | - |

**決済関連カラムの説明**:
- `amount`: Stripe から取得した実際の決済金額（JPY の場合は最小単位で返される）
- `status`: 注文の状態（`completed` = 決済完了、`pending` = 処理中、`cancelled` = キャンセル、`refunded` = 返金済み）
- `source`: 注文のソース（`stripe` = Stripe 経由、`demo` = テスト用）
- `payment_intent_id`: Stripe Payment Intent ID（返金処理などで使用可能）
- `stripe_session_id`: Stripe Checkout Session ID（Webhook 処理で使用）

#### 2. `products` テーブル

| カラム | 型 | 説明 | 報酬関連 |
|--------|---|------|---------|
| `id` | UUID | 商品ID | - |
| `name` | TEXT | 商品名 | - |
| `price` | INTEGER | 商品価格 | - |
| `owner_id` | UUID | ブランド/企業ID | ✅ |
| `creator_share_rate` | DECIMAL | Creator 分配率（デフォルト: 0.25 = 25%） | ✅ |
| `platform_take_rate` | DECIMAL | プラットフォーム分配率（デフォルト: 0.15 = 15%） | ✅ |
| `status` | TEXT | 商品ステータス（`active`, `inactive`） | - |
| `created_at` | TIMESTAMP | 作成日時 | - |
| `updated_at` | TIMESTAMP | 更新日時 | - |

**報酬関連カラムの説明**:
- `owner_id`: 商品の所有者（ブランド/企業）のユーザーID
- `creator_share_rate`: Creator への分配率（例: 0.25 = 25%）
- `platform_take_rate`: プラットフォームへの分配率（例: 0.15 = 15%）
- **注意**: Brand への分配率は `1 - creator_share_rate - platform_take_rate` で計算される

#### 3. `payouts` テーブル

| カラム | 型 | 説明 | 報酬関連 |
|--------|---|------|---------|
| `id` | UUID | Payout ID | - |
| `order_id` | UUID | 注文ID | ✅ |
| `creator_id` | UUID | Creator ID | ✅ |
| `brand_id` | UUID | Brand ID | ✅ |
| `gross_amount` | INTEGER | 総額（注文金額） | ✅ |
| `creator_amount` | INTEGER | Creator への分配額 | ✅ |
| `platform_amount` | INTEGER | プラットフォームへの分配額 | ✅ |
| `brand_amount` | INTEGER | Brand への分配額 | ✅ |
| `status` | TEXT | Payout ステータス（`pending`, `paid`, `cancelled`） | ✅ |
| `created_at` | TIMESTAMP | 作成日時 | - |
| `updated_at` | TIMESTAMP | 更新日時 | - |

**報酬関連カラムの説明**:
- `gross_amount`: 注文の総額（`orders.amount` と同じ値）
- `creator_amount`: Creator への分配額（`gross_amount * creator_share_rate`）
- `platform_amount`: プラットフォームへの分配額（`gross_amount * platform_take_rate`）
- `brand_amount`: Brand への分配額（`gross_amount - creator_amount - platform_amount`）
- `status`: Payout の状態（`pending` = 支払い待ち、`paid` = 支払い済み、`cancelled` = キャンセル）

#### 4. その他の関連テーブル

| テーブル | 決済/報酬関連カラム | 説明 |
|---------|-------------------|------|
| `affiliate_links` | `creator_id`, `product_id` | 紹介リンク（Creator と商品を紐付け） |
| `profiles` | - | ユーザープロフィール（決済情報は含まない） |
| `companies` | - | 企業情報（決済情報は含まない） |

### 現在のフロー (as-is)

#### 1. 決済フロー

```
1. ユーザーが商品購入ページ（/purchase）にアクセス
   ↓
2. ユーザーが「購入」ボタンをクリック
   ↓
3. フロントエンドが POST /api/checkout/create を呼び出し
   - product_id と affiliate_code を送信
   ↓
4. API が Stripe Checkout Session を作成
   - metadata に product_id, creator_id, owner_id, creator_share_rate, platform_take_rate を埋め込み
   ↓
5. ユーザーが Stripe Checkout ページにリダイレクト
   ↓
6. ユーザーが決済を完了
   ↓
7. Stripe が Webhook を送信（checkout.session.completed）
   ↓
8. POST /api/stripe/webhook がイベントを受信
   - 署名検証
   - metadata から情報を取得
   - orders テーブルにレコードを作成（status = 'completed', source = 'stripe'）
   - payouts テーブルにレコードを作成（status = 'pending'）
   ↓
9. ユーザーが /purchase/success にリダイレクト
```

#### 2. 報酬計算フロー

**現在の実装箇所**:

1. **Stripe Webhook** (`src/app/api/stripe/webhook/route.ts`):
   ```typescript
   const creatorAmount = Math.floor(grossAmount * creatorShareRate);
   const platformAmount = Math.floor(grossAmount * platformTakeRate);
   const brandAmount = grossAmount - creatorAmount - platformAmount;
   ```

2. **Payouts Generate API** (`src/app/api/payouts/generate/route.ts`):
   ```typescript
   const creatorAmount = Math.floor(grossAmount * creatorShareRate);
   const platformAmount = Math.floor(grossAmount * platformTakeRate);
   const brandAmount = grossAmount - creatorAmount - platformAmount;
   ```

3. **Creator Dashboard** (`src/app/dashboard/DashboardClient.tsx`):
   ```typescript
   const estimatedCommission = data.reduce((sum, order) => {
     const rate = productRateMap.get(order.product_id) || 0.25;
     return sum + Math.floor((order.amount || 0) * rate);
   }, 0);
   ```

**問題点**:
- 報酬計算ロジックが複数箇所に分散している
- 計算方法が統一されていない（端数処理が異なる可能性がある）
- テストが困難（ロジックが各ファイルに埋め込まれている）

### 足りていない部分 (to-be でやりたいこと)

#### 1. Revenue Share ロジックの共通化

- [ ] `src/lib/revenue-share.ts` を作成
- [ ] 報酬計算ロジックを1箇所に集約
- [ ] 既存コードをリファクタリングして共通関数を使用

#### 2. Stripe Webhook の拡張

- [ ] `payment_intent.succeeded` イベントの処理（現在は `checkout.session.completed` のみ）
- [ ] `payment_intent.payment_failed` イベントの処理（決済失敗時の処理）
- [ ] `charge.refunded` イベントの処理（返金処理）
- [ ] Webhook の再送信処理（冪等性の確保）

#### 3. 決済ログの記録

- [ ] `payment_logs` テーブルの作成（将来のスキーマ変更案）
- [ ] Webhook 処理の成功/失敗を記録
- [ ] エラー時の詳細ログを記録

#### 4. ダッシュボードとの整合性

- [ ] Creator Dashboard の「報酬見込み」計算を `revenue-share.ts` を使用するように修正
- [ ] Brand Dashboard の「売上/コスト/報酬支払い」計算を `revenue-share.ts` を使用するように修正
- [ ] 計算ロジックの不整合を解消

#### 5. テストとサンドボックス動作確認

- [ ] Stripe サンドボックスでのテストフローを確認
- [ ] `.env.local.example` にサンドボックスキーのサンプルを追加
- [ ] テストカードでの決済フローを検証

---

## P7-2: Revenue Share ロジックの共通化

### 実装方針

1. **`src/lib/revenue-share.ts` を作成**
   - `calculateRevenueShare()` 関数を実装
   - 端数処理を統一（`Math.floor()` を使用）
   - Brand への分配額は `grossAmount - creatorAmount - platformAmount` で計算（端数調整）

2. **既存コードのリファクタリング**
   - `src/app/api/stripe/webhook/route.ts`: `calculateRevenueShare()` を使用
   - `src/app/api/payouts/generate/route.ts`: `calculateRevenueShare()` を使用
   - `src/app/dashboard/DashboardClient.tsx`: `calculateRevenueShare()` を使用（報酬見込み計算）

### インターフェース設計

```typescript
export type RevenueShareInput = {
  totalAmount: number;        // 総額（注文金額）
  platformRate: number;     // プラットフォーム分配率（例: 0.15 = 15%）
  brandRate?: number;         // Brand 分配率（オプション、未指定の場合は計算）
  creatorRate: number;        // Creator 分配率（例: 0.25 = 25%）
};

export type RevenueShareResult = {
  platformAmount: number;    // プラットフォームへの分配額
  brandAmount: number;        // Brand への分配額
  creatorAmount: number;      // Creator への分配額
  totalAmount: number;        // 総額（検証用）
};
```

**注意**: `brandRate` はオプション。未指定の場合は `1 - creatorRate - platformRate` で計算される。

---

## P7-3: Stripe Webhook と Orders の整合性チェック

### 現在の実装状況

✅ **実装済み**:
- `checkout.session.completed` イベントの処理
- `orders` テーブルへのレコード作成
- `payouts` テーブルへのレコード作成
- 署名検証

❌ **未実装**:
- `payment_intent.succeeded` イベントの処理
- `payment_intent.payment_failed` イベントの処理
- `charge.refunded` イベントの処理
- Webhook の再送信処理（冪等性の確保）

### 改善方針

1. **最低限の処理を整理**
   - `checkout.session.completed` イベント: 現在の実装を維持
   - `payment_intent.succeeded` イベント: 将来的に追加（現在は `checkout.session.completed` で十分）
   - `payment_intent.payment_failed` イベント: 将来的に追加（`orders.status = 'failed'` に更新）
   - `charge.refunded` イベント: 将来的に追加（`orders.status = 'refunded'` に更新、`payouts` の調整）

2. **Webhook 処理の改善**
   - 冪等性の確保: `stripe_session_id` で重複チェック
   - エラーハンドリングの改善: `payment_logs` テーブルに記録（将来実装）

---

## P7-4: Creator / Brand ダッシュボードとの金額整合性

### 現在の実装状況

#### Creator Dashboard

| 指標 | データソース | 計算ロジック | 問題点 |
|------|------------|------------|--------|
| 報酬見込み | `orders` + `products.creator_share_rate` | `Math.floor(amount * creator_share_rate)` | 計算ロジックが分散 |
| 確定済み報酬 | `payouts.creator_amount` (status = 'paid') | 合計 | ✅ 問題なし |
| 支払い待ち報酬 | `payouts.creator_amount` (status = 'pending') | 合計 | ✅ 問題なし |

#### Brand Dashboard

| 指標 | データソース | 計算ロジック | 問題点 |
|------|------------|------------|--------|
| 総売上 (GMV) | `orders.amount` | 合計 | ✅ 問題なし |
| Brand への分配額 | `payouts.brand_amount` | 合計 | ✅ 問題なし |

### 改善方針

1. **Creator Dashboard の「報酬見込み」計算を統一**
   - `revenue-share.ts` の `calculateRevenueShare()` を使用
   - 既存の計算ロジックを置き換え

2. **計算ロジックの不整合を解消**
   - 暫定の計算ロジックにはコメントで明示
   - `docs/PHASE7_SUMMARY.md` に記載

---

## P7-5: 最低限のテストとサンドボックス動作確認

### 実装方針

1. **Stripe サンドボックスでのテストフロー**
   - テストカード: `4242 4242 4242 4242`（成功）、`4000 0000 0000 0002`（失敗）
   - テストフロー: `/purchase` → Checkout → Webhook → `/purchase/success`

2. **環境変数の管理**
   - `.env.local.example` にサンドボックスキーのサンプルを追加
   - 本番値は含めない

3. **ドキュメント作成**
   - `docs/PHASE7_SUMMARY.md` を作成
   - 決済フローの全体図
   - Revenue Share の計算箇所
   - 未実装部分のリスト

---

## 実装の優先順位

1. **P7-2** (最優先): Revenue Share ロジックの共通化
2. **P7-4**: Creator / Brand ダッシュボードとの金額整合性
3. **P7-3**: Stripe Webhook と Orders の整合性チェック
4. **P7-5**: 最低限のテストとサンドボックス動作確認

---

## 注意事項

- 既存の Phase 2-6 で導入済みのユーティリティ（`supabase-server.ts`, `api-error.ts`, `dashboard-calculations.ts`, `fraud-rules.ts`）を尊重
- 新規追加・修正箇所には「なぜその仕様にしたか」が分かる1行コメントを日本語で残す
- 破壊的な DB マイグレーションは行わず、「将来の schema 変更案」は docs に書く程度に留める

