# Phase 6: Auth / RLS / Fraud Safety - 実装まとめ

最終更新: 2025-01-30

このドキュメントは、Phase 6 で実装した認証・権限管理・不正検知機能の仕様と実装状況をまとめたものです。

---

## 📋 目次

1. [ロールとアクセス権限](#ロールとアクセス権限)
2. [RLS vs API Route チェック](#rls-vs-api-route-チェック)
3. [Fraud Safety 実装状況](#fraud-safety-実装状況)
4. [今後の改善点](#今後の改善点)

---

## ロールとアクセス権限

### ロール一覧

| ロール | 説明 | データソース |
|--------|------|-------------|
| `creator` | クリエイター（インフルエンサー） | `user_metadata.role` |
| `influencer` | インフルエンサー（creator と同等） | `user_metadata.role` |
| `brand` | ブランド（企業） | `user_metadata.role` |
| `company` | 企業（brand と同等） | `user_metadata.role` |
| `admin` | 管理者 | `user_metadata.role` |
| `anonymous` | 未認証ユーザー | 認証なし |

### 画面アクセス権限

| 画面 | creator | influencer | brand | company | admin | anonymous |
|------|---------|------------|-------|---------|-------|-----------|
| `/dashboard` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/brand/dashboard` | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `/brand/products` | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `/login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/` (Landing) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/purchase` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/purchase/success` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/market` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/products` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**注意**: 画面アクセスは主にクライアント側で制御されています。サーバー側の保護は API Route で実装されています。

### API Route アクセス権限

| API Route | creator | influencer | brand | company | admin | anonymous |
|-----------|---------|------------|-------|---------|-------|-----------|
| `/api/affiliate-links/create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/orders/create` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/checkout/create` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/api/rankings` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/brand/products` (GET) | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `/api/brand/products` (POST) | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `/api/payouts/generate` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/api/invitations/send` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/api/admin/users` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/api/fraud/detect` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ (内部呼び出しのみ) |

**詳細**: 各 API Route の実装は `src/app/api/**/route.ts` を参照してください。

---

## RLS vs API Route チェック

### RLS (Row Level Security) の役割

**RLS はデータベース層でのセキュリティ**を提供します。

- **目的**: ユーザーが自分のデータのみアクセスできるようにする
- **実装場所**: Supabase の RLS ポリシー（SQL）
- **現在の実装状況**: 一部のテーブルで RLS が有効（詳細は `docs/PHASE6_AUTH_PLAN.md` を参照）

**RLS が保護するテーブル例**:
- `profiles`: `auth.uid() = id` で自分のプロフィールのみ閲覧可能
- `orders`: `creator_id = auth.uid()` で自分の注文のみ閲覧可能
- `affiliate_links`: `creator_id = auth.uid()` で自分の紹介リンクのみ閲覧可能

### API Route チェックの役割

**API Route チェックはアプリケーション層でのセキュリティ**を提供します。

- **目的**: ロールベースのアクセス制御（RBAC）を実装
- **実装場所**: `src/app/api/**/route.ts` の各エンドポイント
- **実装パターン**:
  ```typescript
  // 1. 認証チェック
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return unauthorizedError();
  }

  // 2. ロールチェック
  const userRole = user.user_metadata?.role;
  if (userRole !== "creator" && userRole !== "influencer") {
    return forbiddenError("Creator access required");
  }
  ```

### 両者の関係

| セキュリティ層 | 役割 | 実装場所 |
|---------------|------|----------|
| **RLS** | データベース層での行レベルの保護 | Supabase RLS ポリシー |
| **API Route チェック** | アプリケーション層でのロールベース制御 | Next.js API Routes |

**ベストプラクティス**:
- **RLS**: データベース層での最後の防御線として機能
- **API Route チェック**: アプリケーション層での早期リジェクトと明確なエラーメッセージ

**注意**: 現在、一部の API Route では Service Role Key を使用して RLS をバイパスしています（例: `/api/rankings`, `/api/fraud/detect`）。これは管理者権限が必要な操作のためです。

---

## Fraud Safety 実装状況

### 現在の実装レベル: MVP（最小限の機能）

#### 実装済み機能

1. **不正検知ルール** (`src/lib/fraud-rules.ts`)
   - ✅ `detectSelfPurchase`: 自己購入検知（高リスク）
   - ✅ `detectBurstOrders`: 短時間での大量注文検知（中リスク）
   - ✅ `detectAmountAnomaly`: 金額異常検知（低リスク）
   - ✅ `detectLowAmountOrder`: 低額注文検知（低リスク）
   - ✅ `detectSameIPOrders`: 同一IPからの注文検知（将来実装、中リスク）

2. **Fraud Detection API** (`/api/fraud/detect`)
   - ✅ 注文作成後に自動実行（非ブロッキング）
   - ✅ 内部呼び出しのみ許可（`x-internal-call: true` ヘッダー）
   - ✅ Rate Limit 保護（20 requests / 5 minutes）
   - ✅ 統一エラーハンドリング

3. **ダッシュボード警告表示**
   - ✅ Creator Dashboard: 自分の注文に不正疑いがある場合に警告表示
   - ✅ Brand Dashboard: 自分の商品の注文に不正疑いがある場合に警告表示
   - ✅ 未レビューの `fraud_flags` 件数を表示

#### データベーススキーマ

**`fraud_flags` テーブル**（想定）:
```sql
CREATE TABLE fraud_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  creator_id UUID REFERENCES auth.users(id),
  brand_id UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  detected_at TIMESTAMP DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP,
  note TEXT
);
```

**注意**: 現在、`fraud_flags` テーブルは実装されていない可能性があります。実装時は上記スキーマを参考にしてください。

#### 検知ルールの詳細

| ルール名 | 検知条件 | リスクレベル | 実装状況 |
|---------|---------|------------|---------|
| `detectSelfPurchase` | Brand と Creator の email/company が同一 | `high` | ✅ 実装済み |
| `detectBurstOrders` | 短時間（5分）で3件以上の注文 | `medium` | ✅ 実装済み |
| `detectAmountAnomaly` | 注文金額が平均の3倍以上 | `low` | ✅ 実装済み |
| `detectLowAmountOrder` | 注文金額が1000円未満 | `low` | ✅ 実装済み |
| `detectSameIPOrders` | 同一IPからの複数注文 | `medium` | ⚠️ 将来実装 |

### 将来の改善点

1. **RLS ポリシーの追加**
   - Creator: 自分の `fraud_flags` を閲覧可能にする
   - Brand: 自分の商品の注文に紐づく `fraud_flags` を閲覧可能にする

2. **機械学習ベースの検知**
   - 現在はルールベースの検知のみ
   - 将来的には ML モデルを導入して精度向上

3. **レビュー機能の実装**
   - Admin が `fraud_flags` をレビューできる UI
   - レビュー後のアクション（承認/却下/警告）

4. **通知機能**
   - 不正疑いが検知された際のメール通知
   - Admin へのアラート通知

5. **詳細なログと分析**
   - 不正検知の履歴を保存
   - 検知率・誤検知率の分析

---

## 今後の改善点

### 優先度: 高

1. **RLS ポリシーの完全実装**
   - `fraud_flags` テーブルへの RLS ポリシー追加
   - Creator/Brand が自分の `fraud_flags` を閲覧可能にする

2. **`fraud_flags` テーブルの作成**
   - 上記スキーマに基づいてテーブルを作成
   - マイグレーションスクリプトの作成

### 優先度: 中

3. **Admin ダッシュボードの実装**
   - `fraud_flags` の一覧表示
   - レビュー機能（承認/却下）
   - 統計情報の表示

4. **通知機能の実装**
   - 不正疑い検知時のメール通知
   - Admin へのアラート通知

### 優先度: 低

5. **機械学習ベースの検知**
   - ML モデルの導入
   - 検知精度の向上

6. **詳細なログと分析**
   - 不正検知の履歴保存
   - 検知率・誤検知率の分析

---

## 関連ドキュメント

- `docs/PHASE6_AUTH_PLAN.md`: ロール・権限・RLS の詳細計画
- `src/lib/fraud-rules.ts`: 不正検知ルールの実装
- `src/app/api/fraud/detect/route.ts`: Fraud Detection API の実装

---

## まとめ

Phase 6 では、以下の機能を実装しました:

1. ✅ **ロール & 権限の棚卸し**: 全ロールとアクセス権限を明確化
2. ✅ **RLS ポリシーの確認とメモ化**: RLS の前提条件を文書化
3. ✅ **API Route 側のロールチェック統一**: 全 API Route にロールチェックを追加
4. ✅ **Fraud Safety（簡易版）の導入**: ルールベースの不正検知を実装
5. ✅ **Brand / Creator ダッシュボードへの反映**: 不正疑いの警告表示を追加
6. ✅ **ドキュメントと「これが仕様です」説明用のまとめ**: 本ドキュメント

**現在の実装レベル**: MVP（最小限の機能）
**次のステップ**: RLS ポリシーの完全実装と `fraud_flags` テーブルの作成

