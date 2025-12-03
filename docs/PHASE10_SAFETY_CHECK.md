# Phase 10: 安全確認チェックリスト

最終更新: 2025-01-30

このドキュメントは、SELL RUSH の初回実運用における安全確認チェックリストです。

---

## 📋 目次

1. [本番環境での致命的な動作の確認](#本番環境での致命的な動作の確認)
2. [Stripe 本番課金の確認](#stripe-本番課金の確認)
3. [トーナメント同時実行の制約](#トーナメント同時実行の制約)
4. [データベースの整合性確認](#データベースの整合性確認)
5. [環境変数の確認](#環境変数の確認)

---

## 本番環境での致命的な動作の確認

### 1. 注文処理の確認

**確認項目**:
- ✅ 注文が正常に記録される（`orders` テーブル）
- ✅ Stripe Webhook が正常に動作する（`/api/stripe/webhook`）
- ✅ 重複注文が作成されない（冪等性の確保）

**確認方法**:
- Stripe Dashboard で Webhook の送信履歴を確認
- Supabase Dashboard で `orders` テーブルを確認
- テスト注文を作成して、正常に記録されることを確認

**注意**: 本番環境では、テスト注文を作成する際は、実際の決済が発生しないよう注意してください。

### 2. ランキング計算の確認

**確認項目**:
- ✅ ランキングが正しく計算される（`buildTournamentRankingFromOrders`）
- ✅ トーナメント期間外の注文が除外される
- ✅ 対象商品以外の注文が除外される

**確認方法**:
- `/admin/arena/tournaments/night-battle-01` でランキングを確認
- Supabase Dashboard で `orders` テーブルを確認
- 手動で計算結果と比較

### 3. 不正検知の確認

**確認項目**:
- ✅ 不正検知が正常に動作する（`fraud-rules.ts`）
- ✅ 自己購入が検知される（`detectSelfPurchase`）
- ✅ 短時間での大量注文が検知される（`detectBurstOrders`）

**確認方法**:
- `/admin/fraud` で不正検知フラグを確認（現在は未実装の可能性あり）
- または Supabase Dashboard で `fraud_flags` テーブルを確認（現在は未実装の可能性あり）

**注意**: 現在、`fraud_flags` テーブルは未実装の可能性があります。不正検知は `fraud-rules.ts` で実行されますが、フラグの保存は未実装です。

---

## Stripe 本番課金の確認

### 1. Stripe 環境変数の確認

**確認項目**:
- ✅ `STRIPE_SECRET_KEY` が本番キーかテストキーか
- ✅ `STRIPE_WEBHOOK_SECRET` が本番シークレットかテストシークレットか

**確認方法**:
- Vercel Dashboard で Environment Variables を確認
- 本番キーは `sk_live_` で始まる
- テストキーは `sk_test_` で始まる

**重要**: 初回運用では、**テストキーを使用することを推奨**します。本番キーを使用する場合は、誤って実際の決済が発生しないよう注意してください。

### 2. Stripe Checkout の確認

**確認項目**:
- ✅ Checkout Session が正常に作成される（`/api/checkout/create`）
- ✅ 決済が正常に完了する（Stripe Dashboard で確認）
- ✅ Webhook が正常に送信される（Stripe Dashboard で確認）

**確認方法**:
- `/purchase` から Checkout Session を作成
- Stripe Dashboard で Checkout Session を確認
- テストカード（`4242 4242 4242 4242`）で決済をテスト

**注意**: 本番環境では、テストカードを使用しても実際の決済は発生しませんが、Webhook は送信されます。

### 3. 本番課金が誤って走らない前提の確認

**前提条件**:
- ✅ 初回運用では、**テストキーを使用することを推奨**
- ✅ 本番キーを使用する場合は、誤って実際の決済が発生しないよう注意
- ✅ テスト注文を作成する際は、実際の決済が発生しないよう注意

**確認方法**:
- Vercel Dashboard で Environment Variables を確認
- `STRIPE_SECRET_KEY` が `sk_test_` で始まることを確認（テストキー）
- または `sk_live_` で始まることを確認（本番キー、使用時は注意）

---

## トーナメント同時実行の制約

### 1. 1つのトーナメントのみ同時に `live` 状態にできる

**制約**:
- ✅ 現在、**1つのトーナメントのみ同時に `live` 状態にできる**前提で実装されています
- ✅ Creator Dashboard の `CurrentTournamentCard` は `status=live` のトーナメントを1件のみ取得
- ✅ 複数の `live` トーナメントがある場合、最初の1件のみ表示される

**確認方法**:
- Supabase Dashboard で `tournaments` テーブルを確認
- `status = 'live'` のトーナメントが1件のみであることを確認

**運用方針**:
- 初回トーナメントが終了するまで、次のトーナメントは `scheduled` 状態で作成
- 前のトーナメントを `finished` に変更してから、次のトーナメントを `live` に変更

### 2. トーナメントのステータス変更は手動

**制約**:
- ✅ 現在、自動的なステータス変更は未実装
- ✅ 手動でステータスを変更する必要がある

**確認方法**:
- `/admin/arena/tournaments` でトーナメントのステータスを確認
- 開始時刻になったら、手動で `scheduled` → `live` に変更
- 終了時刻になったら、手動で `live` → `finished` に変更

---

## データベースの整合性確認

### 1. 必須テーブルの確認

**確認項目**:
- ✅ `tournaments`: トーナメント情報
- ✅ `products`: 商品情報
- ✅ `orders`: 注文情報
- ✅ `affiliate_links`: 紹介リンク情報
- ✅ `profiles`: ユーザープロフィール情報（オプション）

**確認方法**:
- Supabase Dashboard で各テーブルを確認
- テーブルが存在することを確認
- 必要なカラムが存在することを確認

### 2. 外部キー制約の確認

**確認項目**:
- ✅ `tournaments.product_id` → `products.id`
- ✅ `orders.product_id` → `products.id`
- ✅ `orders.creator_id` → `auth.users.id`
- ✅ `affiliate_links.creator_id` → `auth.users.id`

**確認方法**:
- Supabase Dashboard で各テーブルの外部キー制約を確認
- 外部キー制約が正しく設定されていることを確認

### 3. インデックスの確認

**確認項目**:
- ✅ `tournaments.status` にインデックスがある
- ✅ `tournaments.product_id` にインデックスがある
- ✅ `tournaments.start_at` にインデックスがある
- ✅ `tournaments.end_at` にインデックスがある

**確認方法**:
- Supabase Dashboard で各テーブルのインデックスを確認
- インデックスが正しく設定されていることを確認

---

## 環境変数の確認

### 1. 必須環境変数の確認

**確認項目**:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`: Supabase の URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase の Anon Key
- ✅ `SUPABASE_SERVICE_ROLE_KEY`: Supabase の Service Role Key
- ✅ `STRIPE_SECRET_KEY`: Stripe の Secret Key（テストキー推奨）
- ✅ `STRIPE_WEBHOOK_SECRET`: Stripe Webhook の Secret（テストシークレット推奨）

**確認方法**:
- Vercel Dashboard で Environment Variables を確認
- 各環境変数が正しく設定されていることを確認

### 2. 本番環境とテスト環境の切り替え

**確認項目**:
- ✅ 本番環境では、本番キーを使用するかテストキーを使用するか明確にする
- ✅ テスト環境では、テストキーを使用する

**確認方法**:
- Vercel Dashboard で Environment Variables を確認
- `STRIPE_SECRET_KEY` が `sk_test_` で始まることを確認（テストキー）
- または `sk_live_` で始まることを確認（本番キー、使用時は注意）

---

## まとめ

安全確認チェックリスト:

- **本番環境での致命的な動作の確認**: 注文処理、ランキング計算、不正検知
- **Stripe 本番課金の確認**: 環境変数の確認、Checkout の確認、本番課金が誤って走らない前提の確認
- **トーナメント同時実行の制約**: 1つのトーナメントのみ同時に `live` 状態にできる、ステータス変更は手動
- **データベースの整合性確認**: 必須テーブル、外部キー制約、インデックス
- **環境変数の確認**: 必須環境変数、本番環境とテスト環境の切り替え

**重要な注意事項**:
- 初回運用では、**Stripe テストキーを使用することを推奨**
- 本番キーを使用する場合は、誤って実際の決済が発生しないよう注意
- 1つのトーナメントのみ同時に `live` 状態にできる前提で運用

---

## 関連ドキュメント

- `docs/PHASE10_FIRST_LIVE.md`: 初回トーナメント運用仕様
- `docs/PHASE10_RUNBOOK.md`: Admin Runbook（日次監視タスク）
- `docs/PHASE10_CREATOR_INVITE.md`: Creator 向け案内文
- `docs/PHASE10_SUMMARY.md`: 初回運用のまとめ

