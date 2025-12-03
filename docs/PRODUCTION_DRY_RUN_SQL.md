# Production Dry Run: SQL クエリ集

最終更新: 2025-01-30

このドキュメントは、本番環境での Dry Run に使用する SQL クエリをまとめたものです。

---

## 前提条件

- Supabase 本番プロジェクトにアクセスできること
- Admin ユーザーの UUID が分かっていること
- `tournaments` テーブルが存在すること

---

## Step 2: トーナメント作成

### トーナメント作成 SQL

```sql
-- NIGHT BATTLE #01 作成
INSERT INTO tournaments (
  id,
  title,
  slug,
  status,
  start_at,
  end_at,
  product_id,
  created_by
) VALUES (
  gen_random_uuid(),
  'NIGHT BATTLE #01',
  'night-battle-01',
  'scheduled',
  now() + interval '10 minutes',        -- 開始時刻（必要に応じて調整）
  now() + interval '3 days',            -- 終了時刻（72h 想定）
  NULL,                                 -- 商品ID（必要に応じて設定、NULL でも可）
  '<ADMIN_USER_ID_HERE>'                -- Admin ユーザーの UUID に置き換え
);
```

### 注意事項

1. **`<ADMIN_USER_ID_HERE>` の置き換え**:
   - Supabase Dashboard → Authentication → Users から Admin ユーザーの UUID をコピー
   - 上記の SQL の `<ADMIN_USER_ID_HERE>` を実際の UUID に置き換える

2. **`product_id` の設定**:
   - 商品IDを設定する場合は、`products` テーブルから既存の商品IDを取得
   - 今回は検証優先のため、`NULL` でも問題ありません

3. **時刻の調整**:
   - `now() + interval '10 minutes'`: 開始時刻（必要に応じて調整）
   - `now() + interval '3 days'`: 終了時刻（72時間後）

### 作成確認 SQL

```sql
-- トーナメントが正常に作成されたか確認
SELECT 
  id,
  title,
  slug,
  status,
  start_at,
  end_at,
  product_id,
  created_by,
  created_at
FROM tournaments
WHERE slug = 'night-battle-01';
```

---

## Step 5: ステータス遷移

### 5-1. scheduled → live

```sql
-- トーナメントを「開催中」に変更
UPDATE tournaments
SET status = 'live',
    updated_at = now()
WHERE slug = 'night-battle-01';
```

### 5-2. live → finished

```sql
-- トーナメントを「終了」に変更
UPDATE tournaments
SET status = 'finished',
    updated_at = now()
WHERE slug = 'night-battle-01';
```

### ステータス確認 SQL

```sql
-- 現在のステータスを確認
SELECT 
  slug,
  title,
  status,
  start_at,
  end_at,
  updated_at
FROM tournaments
WHERE slug = 'night-battle-01';
```

---

## 補助クエリ

### Admin ユーザーIDの取得

```sql
-- Admin ユーザーの UUID を取得
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'admin'
LIMIT 1;
```

### 既存商品IDの取得（オプション）

```sql
-- 既存の商品IDを取得（product_id を設定する場合）
SELECT 
  id,
  name,
  price,
  created_at
FROM products
ORDER BY created_at DESC
LIMIT 5;
```

### トーナメント削除（Dry Run 終了後）

```sql
-- Dry Run 終了後、テストデータを削除する場合
DELETE FROM tournaments
WHERE slug = 'night-battle-01';
```

**注意**: 本番環境での削除は慎重に行ってください。Dry Run 終了後、必要に応じて削除してください。

---

## トラブルシューティング

### エラー: "column 'name' does not exist"

**原因**: `tournaments` テーブルには `name` カラムがなく、`title` カラムを使用する必要があります。

**解決策**: SQL クエリで `name` を `title` に置き換えてください。

### エラー: "column 'prize_pool_yen' does not exist"

**原因**: `tournaments` テーブルには `prize_pool_yen` カラムが存在しません。

**解決策**: SQL クエリから `prize_pool_yen` を削除してください。

### エラー: "violates check constraint 'tournaments_end_after_start'"

**原因**: 終了時刻が開始時刻より前になっています。

**解決策**: `end_at` が `start_at` より後になるように調整してください。

---

## 関連ドキュメント

- `docs/PHASE10_FIRST_LIVE.md`: 初回トーナメント運用仕様（Dry Run 結果を追記）
- `docs/BUGLOG.md`: バグログ
- `supabase/migrations/20250130_create_tournaments.sql`: トーナメントテーブルのスキーマ定義

