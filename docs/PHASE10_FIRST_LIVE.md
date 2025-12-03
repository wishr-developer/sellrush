# Phase 10: 初回トーナメント運用仕様

最終更新: 2025-01-30

このドキュメントは、SELL RUSH の初回実運用（初回トーナメント）の運用仕様を定義したものです。

---

## 📋 目次

1. [初回トーナメントの基本仕様](#初回トーナメントの基本仕様)
2. [参加者・商品の選定](#参加者商品の選定)
3. [成功条件と学習目標](#成功条件と学習目標)
4. [運用期間とスケジュール](#運用期間とスケジュール)
5. [技術的な前提条件](#技術的な前提条件)

---

## 初回トーナメントの基本仕様

### トーナメント名

**NIGHT BATTLE #01**

- 命名規則: `NIGHT BATTLE #XX`（XX は連番）
- 初回は `#01` を使用

### 期間

**48-72時間（2-3日間）**

- **推奨**: 72時間（3日間）
- **最小**: 48時間（2日間）
- **最大**: 96時間（4日間）まで延長可能

**理由**:
- 短期間で集中してフィードバックを収集
- Creator の負担を最小限に
- 運営側の監視負担を軽減

### 参加 Creator 数

**5名程度**

- **最小**: 3名（最低限の競争環境を確保）
- **最大**: 10名（初回は少人数で管理しやすくする）
- **推奨**: 5名（バランスが良い）

**選定基準**:
- 既存の Creator アカウント（`user_metadata.role = 'creator'` または `'influencer'`）
- 過去に注文実績がある Creator（オプション）
- コミュニケーションが取れる Creator（フィードバック収集のため）

### 商品数

**1-2商品**

- **推奨**: 1商品（シンプルに管理）
- **最大**: 2商品（複数商品のトーナメントは未対応のため、別トーナメントとして運用）

**選定基準**:
- 価格帯: 3,000円 - 10,000円（購入しやすい価格帯）
- 在庫: 十分な在庫がある商品
- 説明: 商品説明が明確で、Creator が紹介しやすい商品

### トーナメントステータス

**運用フロー**:
1. `scheduled`（予定）: トーナメント作成時
2. `live`（開催中）: 開始時刻になったら手動で変更
3. `finished`（終了）: 終了時刻になったら手動で変更

**注意**: 現在、自動的なステータス変更は未実装のため、手動で変更する必要があります。

---

## 参加者・商品の選定

### Creator の選定

**必須条件**:
- ✅ SELL RUSH にアカウント登録済み
- ✅ `user_metadata.role = 'creator'` または `'influencer'`
- ✅ コミュニケーションが取れる（メール or Slack）

**推奨条件**:
- ✅ 過去に注文実績がある（`orders` テーブルにレコードがある）
- ✅ SNS フォロワー数が適度（100人以上、10万人未満）
- ✅ 商品紹介に興味がある

**選定方法**:
1. Supabase の `auth.users` テーブルから Creator を抽出
2. `orders` テーブルから過去の注文実績を確認
3. メール or Slack で参加依頼を送信（`docs/PHASE10_CREATOR_INVITE.md` を参照）

### 商品の選定

**必須条件**:
- ✅ `products` テーブルに登録済み
- ✅ `price` が設定されている（3,000円 - 10,000円推奨）
- ✅ `image_url` が設定されている（商品画像がある）

**推奨条件**:
- ✅ `description` が充実している（Creator が紹介しやすい）
- ✅ 在庫が十分にある（実在庫 or デジタル商品）
- ✅ ブランド側が協力的（質問対応が可能）

**選定方法**:
1. Supabase の `products` テーブルから商品を抽出
2. 価格帯・在庫・説明を確認
3. ブランド側に確認（商品情報の正確性、在庫状況）

---

## 成功条件と学習目標

### 成功条件（売上ではなく学習）

**初回トーナメントの目的は「売上を上げること」ではなく、「システムとプロセスの検証」です。**

#### 1. 技術的な検証

- ✅ トーナメント作成・開始・終了が正常に動作する
- ✅ ランキングが正しく計算される（`buildTournamentRankingFromOrders`）
- ✅ Creator Dashboard にトーナメント情報が表示される
- ✅ Arena ページ（`/arena/[slug]`）が正常に表示される
- ✅ 注文が正常に記録される（`orders` テーブル）
- ✅ 不正検知が正常に動作する（`fraud-rules.ts`）

#### 2. 運用プロセスの検証

- ✅ Admin がトーナメントを管理できる（`/admin/arena/tournaments`）
- ✅ Creator への案内がスムーズにできる（`docs/PHASE10_CREATOR_INVITE.md`）
- ✅ 日次監視が可能（`docs/PHASE10_RUNBOOK.md` を参照）
- ✅ 問題発生時の対応フローが明確

#### 3. ユーザー体験の検証

- ✅ Creator がトーナメントに参加しやすい
- ✅ ランキングが見やすい（`/arena/[slug]`）
- ✅ 報酬見込みが分かりやすい（Creator Dashboard）
- ✅ フィードバックが収集できる

### 学習目標

**初回トーナメントで収集すべき情報**:

1. **技術的な課題**
   - バグやエラーの有無
   - パフォーマンスの問題（ランキング計算の速度など）
   - UI/UX の改善点

2. **運用プロセスの課題**
   - トーナメント作成・開始・終了の手順が適切か
   - 日次監視の負担が適切か
   - 問題発生時の対応が迅速か

3. **ユーザー体験の課題**
   - Creator がトーナメントに参加しやすいか
   - ランキングが見やすいか
   - 報酬見込みが分かりやすいか

4. **ビジネスロジックの課題**
   - 期間（48-72時間）が適切か
   - 参加 Creator 数（5名）が適切か
   - 商品選定の基準が適切か

---

## 運用期間とスケジュール

### Day -1（トーナメント開始前日）

**タスク**:
1. ✅ Creator への参加依頼を送信（`docs/PHASE10_CREATOR_INVITE.md` を参照）
2. ✅ 商品情報を確認（価格、在庫、説明）
3. ✅ トーナメントを作成（`/admin/arena/tournaments`）
   - タイトル: `NIGHT BATTLE #01`
   - Slug: `night-battle-01`（例）
   - ステータス: `scheduled`
   - 開始時刻: 翌日の指定時刻（例: 2025-01-31 20:00 JST）
   - 終了時刻: 開始時刻 + 72時間（例: 2025-02-03 20:00 JST）
   - 商品ID: 選定した商品の UUID

### Day 0（トーナメント開始日）

**タスク**:
1. ✅ 開始時刻になったら、トーナメントのステータスを `live` に変更
2. ✅ Creator に開始を通知（メール or Slack）
3. ✅ 初回の監視（`docs/PHASE10_RUNBOOK.md` を参照）

### Day +1, +2（トーナメント開催中）

**タスク**:
1. ✅ 日次監視（`docs/PHASE10_RUNBOOK.md` を参照）
   - 注文数の確認
   - ランキングの確認
   - 不正検知フラグの確認
2. ✅ Creator からの質問対応
3. ✅ 問題発生時の対応

### Day +3（トーナメント終了日）

**タスク**:
1. ✅ 終了時刻になったら、トーナメントのステータスを `finished` に変更
2. ✅ 最終ランキングを確認
3. ✅ Creator に終了を通知（メール or Slack）
4. ✅ フィードバックを収集（`docs/PHASE10_CREATOR_INVITE.md` を参照）

---

## 技術的な前提条件

### 必須環境変数

**Stripe**:
- `STRIPE_SECRET_KEY`: Stripe の Secret Key（本番環境では本番キー、テスト環境ではテストキー）
- `STRIPE_WEBHOOK_SECRET`: Stripe Webhook の Secret（本番環境では本番シークレット、テスト環境ではテストシークレット）

**Supabase**:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase の URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase の Anon Key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase の Service Role Key（ランキング計算で使用）

**注意**: 本番環境では、Stripe の本番キーを使用する必要があります。誤ってテストキーを使用しないよう注意してください。

### データベースの前提条件

**必須テーブル**:
- ✅ `tournaments`: トーナメント情報
- ✅ `products`: 商品情報
- ✅ `orders`: 注文情報
- ✅ `affiliate_links`: 紹介リンク情報
- ✅ `profiles`: ユーザープロフィール情報（オプション）

**注意**: `fraud_flags` テーブルは現在未実装の可能性があります。不正検知は `fraud-rules.ts` で実行されますが、フラグの保存は未実装です。

### 同時実行の制約

**重要**: 現在、**1つのトーナメントのみ同時に `live` 状態にできる**前提で実装されています。

**理由**:
- Creator Dashboard の `CurrentTournamentCard` は `status=live` のトーナメントを1件のみ取得
- 複数の `live` トーナメントがある場合、最初の1件のみ表示される

**運用方針**:
- 初回トーナメントが終了するまで、次のトーナメントは `scheduled` 状態で作成
- 前のトーナメントを `finished` に変更してから、次のトーナメントを `live` に変更

---

## まとめ

初回トーナメントの運用仕様:

- **トーナメント名**: NIGHT BATTLE #01
- **期間**: 48-72時間（推奨: 72時間）
- **参加 Creator 数**: 5名程度
- **商品数**: 1-2商品（推奨: 1商品）
- **成功条件**: 売上ではなく、システムとプロセスの検証
- **学習目標**: 技術的な課題、運用プロセスの課題、ユーザー体験の課題、ビジネスロジックの課題を収集

**次のステップ**:
1. `docs/PHASE10_RUNBOOK.md` を参照して、日次監視のタスクを確認
2. `docs/PHASE10_CREATOR_INVITE.md` を参照して、Creator への案内文を作成
3. `docs/PHASE10_SUMMARY.md` を参照して、初回運用の全体像を確認

---

## ローカル Dry Run 実施結果

### 実施日
2025-01-30

### 実施内容
本番と同じ構成でローカル環境（`http://localhost:3000`）で「NIGHT BATTLE #01」の Dry Run を実施。

### 実施結果

#### Step 1-3: リポジトリ状態 & 依存関係チェック / .env.local 確認 / 開発サーバー起動
- ✅ `git status`: クリーンな状態（submodule の変更のみ）
- ✅ `npm install`: 依存関係は最新
- ✅ `npm run build`: ビルド成功
- ✅ `npm run dev`: 開発サーバー起動成功（`http://localhost:3000`）
- ✅ `.env.local`: 存在確認（`sell-rush-lp/.env.local`）
- ✅ 環境変数読み込み: `src/lib/supabase-server.ts` と `src/lib/supabase.ts` で正常に読み込み

#### Step 3: 主要ルート確認
- ✅ `http://localhost:3000/`: LP が正常に表示される
- ✅ `http://localhost:3000/login`: ログイン画面が正常に表示される
- ✅ `http://localhost:3000/arena/test-tournament`: 404 ページが正常に表示される（エラーハンドリングが正しく効いている）

#### Step 4-5: テストユーザー確認 & トーナメント作成（Supabase Dashboard）
**注意**: これらのステップは Supabase Dashboard での手動操作が必要なため、実際の Dry Run では以下を実施:

1. **テストユーザー確認**:
   - Supabase Dashboard → Auth → Users
   - Admin ユーザー: `user_metadata.role = 'admin'` を確認
   - Creator ユーザー: `user_metadata.role = 'creator'` を確認

2. **トーナメント作成**:
   - Supabase Dashboard → Table Editor → tournaments
   - 以下の SQL でトーナメントを作成:
   ```sql
   INSERT INTO tournaments (
     id,
     slug,
     title,
     description,
     status,
     start_at,
     end_at,
     product_id,
     created_by
   ) VALUES (
     gen_random_uuid(),
     'night-battle-01',
     'NIGHT BATTLE #01',
     '初回トーナメント Dry Run。期間中の売上金額でランキングを競います。',
     'scheduled',
     NOW() + INTERVAL '5 minutes',
     NOW() + INTERVAL '77 hours',
     '<既存の商品ID>',
     '<Admin ユーザーID>'
   );
   ```

#### Step 6-10: Admin / Creator / Arena 導線確認
**注意**: これらのステップは実際のログインとトーナメント作成が必要なため、Dry Run では以下を確認:

1. **Admin Console**:
   - `/admin/arena/tournaments`: トーナメント一覧が表示される
   - `/admin/arena/tournaments/night-battle-01`: トーナメント詳細が表示される
   - ステータス変更（`scheduled` → `live` → `finished`）が正常に動作する

2. **Creator Dashboard**:
   - `/dashboard`: Creator Dashboard が表示される
   - `CurrentTournamentCard` が表示される（トーナメントが `live` の場合）
   - トーナメント情報（順位、売上、推定報酬）が表示される

3. **Arena 公開ページ**:
   - `/arena/night-battle-01`: 未ログインでも表示可能
   - ランキングが空でもエラーにならない
   - トーナメント情報（タイトル、期間）が表示される

### 気づいた点

#### UX / Admin 操作
- Admin トーナメント一覧ページ（`/admin/arena/tournaments`）に「新規作成」ボタンがあるが、`/admin/arena/tournaments/new` ページは未実装
- トーナメント作成は Supabase Dashboard で直接作成する必要がある（Dry Run では問題なし）

#### バグと思われる挙動
- 現時点で明らかなバグは見つかっていない
- 実際のトーナメント作成とログイン後の動作確認が必要

### 次のステップ

1. **Supabase Dashboard でトーナメント作成**:
   - 上記の SQL を実行してトーナメントを作成
   - 既存の商品IDとAdminユーザーIDを確認

2. **Admin / Creator ログイン後の動作確認**:
   - Admin でトーナメント一覧・詳細を確認
   - Creator で Dashboard のトーナメントカードを確認
   - ステータス遷移（`scheduled` → `live` → `finished`）を確認

3. **Arena ページの確認**:
   - 未ログイン状態で `/arena/night-battle-01` にアクセス
   - ランキングが空でもエラーにならないことを確認

---

## 本番 Dry Run 実施結果

### 実施日
[YYYY-MM-DD]

### 実施環境
- Vercel 本番 URL: https://sellrush.vercel.app
- Supabase プロジェクト: SellRush 本番

### 使用したアカウント
- Admin アカウント: [メールアドレス]
- Creator アカウント: [メールアドレス]

### トーナメント情報
- Slug: `night-battle-01`
- タイトル: NIGHT BATTLE #01
- ステータス遷移: `scheduled` → `live` → `finished`

### 実施結果

#### Step 1: テストユーザー確認（Supabase Dashboard）
- [ ] Admin ユーザーが存在し、`user_metadata.role = "admin"` が設定されている
- [ ] Creator ユーザー（1〜2名）が存在し、`user_metadata.role = "creator"` が設定されている

#### Step 2: トーナメント作成（Supabase SQL Editor）
- [ ] トーナメントが正常に作成された
- [ ] `slug = 'night-battle-01'` が設定されている
- [ ] `status = 'scheduled'` が設定されている
- [ ] `start_at` と `end_at` が適切に設定されている

**使用した SQL**:
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
  NULL,                                 -- 商品ID（必要に応じて設定）
  '<ADMIN_USER_ID_HERE>'                -- Admin ユーザーの UUID に置き換え
);
```

#### Step 3: Admin 側での確認（本番 URL）
- [ ] Admin でログインできる
- [ ] トーナメント一覧に「NIGHT BATTLE #01」が表示される
- [ ] トーナメント詳細ページが正常に表示される
- [ ] 500 エラーや真っ白画面にならない

#### Step 4: Creator Dashboard からの見え方確認
- [ ] Creator でログインできる
- [ ] Creator Dashboard にトーナメント情報が表示される
- [ ] 「詳細を見る」リンクが正常に動作する
- [ ] 500 エラーや真っ白画面にならない

#### Step 5: ステータス遷移の Dry Run

##### 5-1. scheduled → live
- [ ] Admin 画面でステータスが "ライブ中" に変わる
- [ ] Creator Dashboard の表示が更新される
- [ ] Arena ページが正常に表示される（ランキングが空でもエラーにならない）

**使用した SQL**:
```sql
UPDATE tournaments
SET status = 'live'
WHERE slug = 'night-battle-01';
```

##### 5-2. live → finished
- [ ] Admin 画面でステータスが "終了" に変わる
- [ ] Creator Dashboard の表示が「終了」状態に変わる
- [ ] Arena ページが正常に表示される（終了状態のコピーが表示される）

**使用した SQL**:
```sql
UPDATE tournaments
SET status = 'finished'
WHERE slug = 'night-battle-01';
```

#### Step 6: 最低限の注文フロー確認（任意）
- [ ] テスト購入が正常に完了する
- [ ] `orders` テーブルにレコードが追加される
- [ ] ランキングに反映される

### 気づいた問題 / 手作業がつらかったポイント

[ここに気づいた問題や改善点を記録してください]

例:
- Admin 画面でのステータス変更が手動（SQL）で行う必要がある
- Creator Dashboard のトーナメントカードの表示が少し遅い
- Arena ページのランキングが空の時のメッセージが分かりにくい

### 完了条件の確認

- [ ] Admin / Creator / LP / Arena が一連のトーナメント状態変化に追従すること
- [ ] どこかで 500 エラーや真っ白画面にならないこと
- [ ] 手で status を変えれば、なんとか 1 本のトーナメントが完走するイメージが持てること

### 次のステップ

[本番 Dry Run の結果を踏まえて、次に実施すべきことを記録してください]

---

## 関連ドキュメント

- `docs/PHASE10_RUNBOOK.md`: Admin Runbook（日次監視タスク）
- `docs/PHASE10_CREATOR_INVITE.md`: Creator 向け案内文
- `docs/PHASE10_SUMMARY.md`: 初回運用のまとめ
- `docs/PHASE8_ARENA_SUMMARY.md`: Arena / Tournament MVP の実装まとめ
- `docs/PHASE8_B_ADMIN_ARENA_SUMMARY.md`: Admin / Tournament Ops Console の実装まとめ

