# SELL RUSH Phase 2 実装サマリ

## 実装内容

Phase 2（決済・報酬精算）の実装を完了しました。以下が実装内容です。

## 1. Stripe 連携

### 1.1 パッケージ追加
- `stripe` パッケージをインストール

### 1.2 環境変数設定
以下の環境変数を `.env.local` に追加してください：

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 1.3 新規作成ファイル

#### `/api/checkout/create/route.ts`
- Stripe Checkout Session を作成するエンドポイント
- 商品と紹介リンクを検証
- metadata に必要な情報を埋め込む
- Checkout URL を返す

#### `/api/stripe/webhook/route.ts`
- Stripe Webhook ハンドラー
- 署名検証を実装
- `checkout.session.completed` イベントを処理
- orders テーブルにレコードを作成
- payouts を自動生成

### 1.4 修正ファイル

#### `/app/purchase/page.tsx`
- 直接注文作成ではなく、Stripe Checkout にリダイレクトするように変更
- `/api/checkout/create` を呼び出して Checkout URL を取得
- 取得した URL にリダイレクト

#### `/app/purchase/success/page.tsx` (新規作成)
- 購入完了ページ
- Stripe Checkout から戻ってきた際に表示
- セッションIDを表示
- 商品一覧・ダッシュボードへのリンクを提供

## 2. 報酬配分ロジック

### 2.1 Webhook での自動生成
- `checkout.session.completed` イベント時に自動で payouts を生成
- 商品ごとの分配率（`creator_share_rate`, `platform_take_rate`）を使用
- 計算式:
  - `creator_amount = gross_amount * creator_share_rate`
  - `platform_amount = gross_amount * platform_take_rate`
  - `brand_amount = gross_amount - creator_amount - platform_amount`

### 2.2 将来の Stripe Connect 対応
- TODO コメントを追加:
  - `users` テーブル（または `user_metadata`）に `stripe_connect_account_id` を持たせる想定
  - `payouts.status='pending'` のものをバッチで transfer する処理を将来追加

## 3. フロント改善

### 3.1 `/dashboard` (インフルエンサー)
- 報酬サマリーを追加:
  - 確定済み報酬（`payouts.status='paid'`）
  - 支払い待ち報酬（`payouts.status='pending'`）
- `payouts` テーブルからデータを取得して表示

### 3.2 `/brand` (企業)
- ブランド取り分のKPIを追加:
  - ブランド取り分（合計）
  - 支払い済み
  - 支払い待ち
- `payouts` テーブルから `brand_id` でフィルタして集計

### 3.3 Admin側
- 既存の `/admin/payouts` ページが存在することを確認
- ステータスフィルタ（pending/paid）が実装済み

## 4. データベーススキーマ

### 4.1 orders テーブル
以下のカラムが使用されます（既存）:
- `product_id`
- `creator_id`
- `affiliate_link_id`
- `status`
- `amount`
- `source` (新規: "stripe" を設定)
- `payment_intent_id` (新規: Stripe Payment Intent ID)
- `stripe_session_id` (新規: Stripe Checkout Session ID)

### 4.2 payouts テーブル
以下のカラムが使用されます（既存）:
- `order_id`
- `creator_id`
- `brand_id`
- `gross_amount`
- `creator_amount`
- `platform_amount`
- `brand_amount`
- `status` (pending/paid)

## 5. 実装上の注意点

### 5.1 Webhook の署名検証
- `STRIPE_WEBHOOK_SECRET` を使用して署名検証を実装
- 検証失敗時は 400 エラーを返す

### 5.2 Supabase RLS
- Webhook では Service Role Key を使用して RLS をバイパス
- 通常の API エンドポイントでは RLS が有効

### 5.3 エラーハンドリング
- すべての Supabase クエリでエラーチェックを実装
- エラー時はログに記録し、適切な HTTP ステータスコードを返す

### 5.4 将来の拡張
- `payment_logs` テーブルを作成して、失敗時のログを記録する TODO コメントを追加
- Stripe Connect 対応のための設計コメントを追加

## 6. テスト方法

### 6.1 Stripe テストモード
1. Stripe ダッシュボードでテストモードを有効化
2. テスト用のカード番号を使用（例: `4242 4242 4242 4242`）
3. Webhook をローカルでテストする場合は Stripe CLI を使用

### 6.2 Webhook のローカルテスト
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 7. 変更ファイル一覧

### 新規作成
- `/app/api/checkout/create/route.ts`
- `/app/api/stripe/webhook/route.ts`
- `/app/purchase/success/page.tsx`

### 修正
- `/app/purchase/page.tsx`
- `/app/dashboard/DashboardClient.tsx`
- `/app/brand/page.tsx`

### パッケージ追加
- `stripe` (package.json)

## 8. 次のステップ

1. 環境変数の設定（`.env.local`）
2. Stripe ダッシュボードでの Webhook エンドポイント設定
3. テスト決済の実行
4. 報酬配分の確認
5. Stripe Connect の実装（将来）

