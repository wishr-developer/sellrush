# SELL RUSH Admin｜ダミーデータ投入手順（Supabase）

## 1. ファイルの場所

- **プロジェクト**: `sell-rush-lp/sell-rush-admin`
- **SQL ファイル**: `supabase-dummy-data.sql`

このファイルを Supabase の SQL Editor で実行することで、Admin ダッシュボードのグラフを表示するためのダミーデータを投入できます。

---

## 2. Supabase ダッシュボードでの手順

### Step 1: Supabase プロジェクトを開く

1. Supabase のダッシュボードにアクセス
2. 対象のプロジェクトを選択

### Step 2: SQL Editor を開く

1. 左メニューから **「SQL Editor」** をクリック
2. 上部の **「New query」** ボタンをクリック（または既存のクエリエリアを使用）

### Step 3: SQL ファイルの内容をコピー

1. ローカルで `supabase-dummy-data.sql` を開く
   - パス: `sell-rush-lp/sell-rush-admin/supabase-dummy-data.sql`
2. ファイルの内容を **すべて選択**（`Cmd+A` / `Ctrl+A`）してコピー（`Cmd+C` / `Ctrl+C`）

### Step 4: SQL Editor にペースト

1. Supabase の SQL Editor のクエリエリアにペースト（`Cmd+V` / `Ctrl+V`）
2. SQL が正しく表示されていることを確認

### Step 5: 実行

1. 右上の **「Run」ボタン**（または `Cmd+Enter` / `Ctrl+Enter`）をクリック
2. 下部の結果エリアに `SUCCESS` や `INSERT 0 25` などのメッセージが表示されれば成功

---

## 3. 確認方法

### 方法 1: Table Editor で確認

1. 左メニューから **「Table Editor」** をクリック
2. 以下のテーブルを順番に開いて、レコードが追加されているか確認：
   - `products` → 3件の商品が追加されている
   - `orders` → 25件の注文が追加されている
   - `payouts` → 8件の payout が追加されている
   - `fraud_flags` → 10件のフラグが追加されている

### 方法 2: SQL で確認

SQL Editor で以下のクエリを実行：

```sql
-- 各テーブルの件数を確認
SELECT COUNT(*) as products_count FROM public.products;
SELECT COUNT(*) as orders_count FROM public.orders;
SELECT COUNT(*) as payouts_count FROM public.payouts;
SELECT COUNT(*) as fraud_flags_count FROM public.fraud_flags;

-- ステータス別の件数を確認
SELECT status, COUNT(*) FROM public.orders GROUP BY status;
SELECT severity, COUNT(*) FROM public.fraud_flags GROUP BY severity;
SELECT status, COUNT(*) FROM public.payouts GROUP BY status;
```

---

## 4. Admin ダッシュボードで確認

1. Admin サーバーを起動（まだ起動していない場合）:
   ```bash
   cd sell-rush-admin
   npm run dev
   ```

2. ブラウザで `http://localhost:3003/admin` にアクセス

3. 各ページでグラフが表示されることを確認:
   - `/admin/analytics` - GMV × Orders デュアルチャート、時間帯別分布など
   - `/admin/orders` - ステータス別注文数 BarChart
   - `/admin/products` - GMV 上位5商品 BarChart
   - `/admin/users` - 上位Creator GMV ランキング BarChart
   - `/admin/payouts` - ステータス別内訳円グラフ
   - `/admin/security` - severity 別件数 BarChart、日別 Fraud 発生数 LineChart

---

## 5. 注意点

### 安全性について

- ✅ **このスクリプトは既存テーブルを削除したり初期化しません**
- ✅ **破壊的な操作（DELETE / DROP / TRUNCATE）は一切含まれていません**
- ✅ **何度実行してもエラーにならないよう `ON CONFLICT DO NOTHING` にしてあります**
- ✅ **既存データがあっても、新しいダミーデータが追加されるだけです**

### 実行前の確認

- 本番データが入っているプロジェクトで実行する場合は、念のためテーブル内容を先に確認してください
- テスト環境で実行することを推奨します

### トラブルシューティング

**エラーが出る場合**:
- SQL Editor のエラーメッセージを確認
- テーブル構造が想定と異なる可能性があります（テーブル定義を確認してください）

**データが表示されない場合**:
- RLS（Row Level Security）ポリシーを確認
- Admin ユーザーでログインしているか確認

---

## 6. 投入されるデータの詳細

### products（3商品）
- エナジードリンクA（¥2,980）
- 美容サプリB（¥4,980）
- ガジェットC（¥12,800）

### orders（25件）
- 過去30日間に分散
- status: `completed` / `pending` / `cancelled` を混在

### payouts（8件）
- status: `pending` / `approved` / `paid` を混在
- 最近の completed 注文に紐づく

### fraud_flags（10件）
- severity: `low` / `medium` / `high` を混在（high を2-3件含む）
- 直近7〜14日に分散
- reviewed: true/false を混在

---

以上で、Admin ダッシュボードのグラフが正しく表示される状態になります。
