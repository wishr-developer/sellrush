# Phase 10: Admin Runbook（初回トーナメント運用）

最終更新: 2025-01-30

このドキュメントは、SELL RUSH の初回トーナメント運用における Admin の日次タスクをまとめたものです。

---

## 📋 目次

1. [Day -1: トーナメント開始前日](#day--1-トーナメント開始前日)
2. [Day 0: トーナメント開始日](#day-0-トーナメント開始日)
3. [Day +1, +2: トーナメント開催中](#day-1-2-トーナメント開催中)
4. [Day +3: トーナメント終了日](#day-3-トーナメント終了日)
5. [毎日確認すべき指標](#毎日確認すべき指標)
6. [手動で行うこと（自動化しない）](#手動で行うこと自動化しない)
7. [問題発生時の対応](#問題発生時の対応)

---

## Day -1: トーナメント開始前日

### タスク一覧

#### 1. Creator への参加依頼を送信

**手順**:
1. `docs/PHASE10_CREATOR_INVITE.md` を参照して、案内文を作成
2. 選定した Creator（5名程度）にメール or Slack で送信
3. 参加可否の確認

**確認事項**:
- ✅ Creator がアカウント登録済みか
- ✅ `user_metadata.role = 'creator'` または `'influencer'` か
- ✅ コミュニケーションが取れるか

#### 2. 商品情報を確認

**確認項目**:
- ✅ 商品が `products` テーブルに登録済みか
- ✅ 価格が適切か（3,000円 - 10,000円推奨）
- ✅ 商品画像（`image_url`）が設定されているか
- ✅ 商品説明（`description`）が充実しているか
- ✅ 在庫が十分にあるか（実在庫 or デジタル商品）

**確認方法**:
- Supabase Dashboard で `products` テーブルを確認
- または `/brand/products` で商品一覧を確認

#### 3. トーナメントを作成

**手順**:
1. `/admin/arena/tournaments` にアクセス
2. 「新規作成」ボタンをクリック（現在は未実装のため、API を直接呼び出す必要がある）
3. または、Supabase Dashboard で `tournaments` テーブルに直接レコードを作成

**作成するレコード**:
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
  '初回トーナメント。期間中の売上金額でランキングを競います。',
  'scheduled',
  '2025-01-31 20:00:00+09',  -- 開始時刻（JST）
  '2025-02-03 20:00:00+09',  -- 終了時刻（開始時刻 + 72時間）
  '<商品のUUID>',
  '<Admin のユーザーID>'
);
```

**確認事項**:
- ✅ `slug` がユニークか（既存のトーナメントと重複していないか）
- ✅ `start_at` と `end_at` が正しいか（`end_at > start_at`）
- ✅ `product_id` が正しいか（`products` テーブルに存在するか）
- ✅ `status` が `scheduled` か

---

## Day 0: トーナメント開始日

### タスク一覧

#### 1. トーナメントのステータスを `live` に変更

**手順**:
1. `/admin/arena/tournaments` にアクセス
2. 作成したトーナメントの「詳細」ボタンをクリック
3. 「編集」ボタンをクリック
4. ステータスを `scheduled` から `live` に変更
5. 「保存」ボタンをクリック

**確認事項**:
- ✅ 開始時刻（`start_at`）が現在時刻より前か（または現在時刻か）
- ✅ ステータスが `live` に変更されたか
- ✅ Creator Dashboard にトーナメント情報が表示されるか（`/dashboard` で確認）

#### 2. Creator に開始を通知

**手順**:
1. 参加 Creator（5名程度）にメール or Slack で通知
2. トーナメント名、期間、商品情報、Arena ページの URL を伝える

**通知内容の例**:
```
NIGHT BATTLE #01 が開始しました！

期間: 2025-01-31 20:00 〜 2025-02-03 20:00（72時間）
商品: [商品名]
Arena ページ: https://sellrush.vercel.app/arena/night-battle-01

ランキングはリアルタイムで更新されます。頑張ってください！
```

#### 3. 初回の監視

**確認項目**:
- ✅ 注文数（`orders` テーブル）
- ✅ ランキング（`/admin/arena/tournaments/night-battle-01`）
- ✅ 不正検知フラグ（`/admin/fraud`、現在は未実装の可能性あり）

**確認方法**:
- Supabase Dashboard で `orders` テーブルを確認
- `/admin/arena/tournaments/night-battle-01` でランキングを確認
- `/admin/fraud` で不正検知フラグを確認（現在は未実装の可能性あり）

---

## Day +1, +2: トーナメント開催中

### タスク一覧

#### 1. 日次監視（毎日1回、推奨: 朝9時）

**確認項目**:
- ✅ 注文数（前日比）
- ✅ ランキング（上位3名の順位変動）
- ✅ 不正検知フラグ（`/admin/fraud`、現在は未実装の可能性あり）
- ✅ Creator からの質問対応

**確認方法**:
- Supabase Dashboard で `orders` テーブルを確認
  ```sql
  SELECT 
    COUNT(*) as order_count,
    SUM(amount) as total_revenue,
    DATE(created_at) as order_date
  FROM orders
  WHERE created_at >= '<トーナメント開始時刻>'
    AND created_at <= '<トーナメント終了時刻>'
    AND product_id = '<商品ID>'
    AND status = 'completed'
  GROUP BY DATE(created_at)
  ORDER BY order_date DESC;
  ```
- `/admin/arena/tournaments/night-battle-01` でランキングを確認
- `/admin/fraud` で不正検知フラグを確認（現在は未実装の可能性あり）

**確認すべき指標**:
- 注文数: 前日比で増加しているか
- ランキング: 順位変動が正常か（異常な変動がないか）
- 不正検知フラグ: 新規フラグがないか（`severity = 'high'` のフラグは要確認）

#### 2. Creator からの質問対応

**よくある質問**:
- Q: ランキングはどこで確認できますか？
  - A: `/arena/night-battle-01` または Creator Dashboard の「現在のトーナメント」カード
- Q: 報酬はいつ支払われますか？
  - A: トーナメント終了後、Admin が手動で payout を生成します（現在は自動化されていません）
- Q: 自分の紹介リンクはどこで取得できますか？
  - A: `/dashboard` の「紹介リンク」セクション

**対応方針**:
- 質問は迅速に対応（24時間以内を目標）
- 不明な点は開発チームに確認

#### 3. 問題発生時の対応

**問題の種類**:
- ランキングが更新されない
- 注文が記録されない
- 不正検知フラグが誤検知される
- Creator Dashboard にトーナメント情報が表示されない

**対応手順**:
1. 問題を確認（`docs/PHASE10_SUMMARY.md` の「問題発生時の対応」を参照）
2. 必要に応じて開発チームに連絡
3. Creator に状況を説明（必要に応じて）

---

## Day +3: トーナメント終了日

### タスク一覧

#### 1. トーナメントのステータスを `finished` に変更

**手順**:
1. `/admin/arena/tournaments` にアクセス
2. 作成したトーナメントの「詳細」ボタンをクリック
3. 「編集」ボタンをクリック
4. ステータスを `live` から `finished` に変更
5. 「保存」ボタンをクリック

**確認事項**:
- ✅ 終了時刻（`end_at`）が現在時刻より前か（または現在時刻か）
- ✅ ステータスが `finished` に変更されたか
- ✅ Creator Dashboard に「このバトルは終了しました」と表示されるか（`/dashboard` で確認）

#### 2. 最終ランキングを確認

**確認項目**:
- ✅ 最終順位（上位3名）
- ✅ 総売上（`orders` テーブルから集計）
- ✅ 参加 Creator 数（ランキングに表示されている Creator 数）

**確認方法**:
- `/admin/arena/tournaments/night-battle-01` でランキングを確認
- Supabase Dashboard で `orders` テーブルを確認
  ```sql
  SELECT 
    creator_id,
    COUNT(*) as order_count,
    SUM(amount) as total_revenue
  FROM orders
  WHERE created_at >= '<トーナメント開始時刻>'
    AND created_at <= '<トーナメント終了時刻>'
    AND product_id = '<商品ID>'
    AND status = 'completed'
  GROUP BY creator_id
  ORDER BY total_revenue DESC;
  ```

#### 3. Creator に終了を通知

**手順**:
1. 参加 Creator（5名程度）にメール or Slack で通知
2. 最終ランキング、総売上、フィードバック依頼を伝える

**通知内容の例**:
```
NIGHT BATTLE #01 が終了しました！

最終ランキング:
1位: [Creator名] - ¥[売上金額]
2位: [Creator名] - ¥[売上金額]
3位: [Creator名] - ¥[売上金額]

総売上: ¥[総売上金額]
参加 Creator 数: [参加者数]名

ご参加ありがとうございました！
フィードバックをお願いします（[フィードバックフォームのURL]）。
```

#### 4. フィードバックを収集

**収集項目**:
- トーナメントの参加しやすさ
- ランキングの見やすさ
- 報酬見込みの分かりやすさ
- 改善点・要望

**収集方法**:
- Google Forms などのフォームを作成
- Creator に送信（メール or Slack）
- 回答期限: トーナメント終了後1週間以内

---

## 毎日確認すべき指標

### 1. 注文数

**確認方法**:
- Supabase Dashboard で `orders` テーブルを確認
- または `/admin/orders` で注文一覧を確認

**確認すべき項目**:
- 前日比で注文数が増加しているか
- 異常に多い注文がないか（不正検知の可能性）
- 注文が記録されていない期間がないか

### 2. ランキング

**確認方法**:
- `/admin/arena/tournaments/night-battle-01` でランキングを確認

**確認すべき項目**:
- 上位3名の順位変動が正常か（異常な変動がないか）
- ランキングが正しく計算されているか（`buildTournamentRankingFromOrders`）
- 参加 Creator 数が正しいか

### 3. 不正検知フラグ

**確認方法**:
- `/admin/fraud` で不正検知フラグを確認（現在は未実装の可能性あり）
- または Supabase Dashboard で `fraud_flags` テーブルを確認（現在は未実装の可能性あり）

**確認すべき項目**:
- 新規フラグがないか（`reviewed = false`）
- `severity = 'high'` のフラグがないか（要確認）
- 誤検知の可能性がないか

**注意**: 現在、`fraud_flags` テーブルは未実装の可能性があります。不正検知は `fraud-rules.ts` で実行されますが、フラグの保存は未実装です。

---

## 手動で行うこと（自動化しない）

### 1. トーナメントのステータス変更

**理由**: 初回運用では、手動でステータスを変更することで、問題を早期に発見できる

**手順**:
- Day 0: `scheduled` → `live`
- Day +3: `live` → `finished`

### 2. Creator への通知

**理由**: 初回運用では、Creator とのコミュニケーションを重視

**通知タイミング**:
- Day -1: 参加依頼
- Day 0: 開始通知
- Day +3: 終了通知

### 3. 日次監視

**理由**: 初回運用では、問題を早期に発見するため

**監視頻度**:
- 毎日1回（推奨: 朝9時）
- 問題発生時は随時確認

### 4. フィードバック収集

**理由**: 初回運用では、Creator からのフィードバックを重視

**収集方法**:
- Google Forms などのフォームを作成
- Creator に送信（メール or Slack）

---

## 問題発生時の対応

### 1. ランキングが更新されない

**原因**:
- `buildTournamentRankingFromOrders` の計算エラー
- `orders` テーブルのデータ不整合

**対応**:
1. `/admin/arena/tournaments/night-battle-01` でランキングを確認
2. Supabase Dashboard で `orders` テーブルを確認
3. 必要に応じて開発チームに連絡

### 2. 注文が記録されない

**原因**:
- Stripe Webhook の処理エラー
- `orders` テーブルへの挿入エラー

**対応**:
1. Supabase Dashboard で `orders` テーブルを確認
2. Stripe Dashboard で Webhook の送信履歴を確認
3. 必要に応じて開発チームに連絡

### 3. 不正検知フラグが誤検知される

**原因**:
- `fraud-rules.ts` のルールが厳しすぎる
- データの不整合

**対応**:
1. `/admin/fraud` で不正検知フラグを確認（現在は未実装の可能性あり）
2. 誤検知の場合は、フラグを `reviewed = true` に更新（現在は未実装の可能性あり）
3. 必要に応じて開発チームに連絡

### 4. Creator Dashboard にトーナメント情報が表示されない

**原因**:
- `CurrentTournamentCard` の API 呼び出しエラー
- トーナメントのステータスが `live` でない

**対応**:
1. `/dashboard` で Creator Dashboard を確認
2. `/admin/arena/tournaments/night-battle-01` でトーナメントのステータスを確認
3. 必要に応じて開発チームに連絡

---

## まとめ

初回トーナメント運用における Admin の日次タスク:

- **Day -1**: Creator への参加依頼、商品情報の確認、トーナメントの作成
- **Day 0**: トーナメントのステータスを `live` に変更、Creator への開始通知、初回の監視
- **Day +1, +2**: 日次監視（注文数、ランキング、不正検知フラグ）、Creator からの質問対応
- **Day +3**: トーナメントのステータスを `finished` に変更、最終ランキングの確認、Creator への終了通知、フィードバック収集

**毎日確認すべき指標**:
- 注文数（前日比）
- ランキング（上位3名の順位変動）
- 不正検知フラグ（新規フラグ、`severity = 'high'` のフラグ）

**手動で行うこと（自動化しない）**:
- トーナメントのステータス変更
- Creator への通知
- 日次監視
- フィードバック収集

---

## 関連ドキュメント

- `docs/PHASE10_FIRST_LIVE.md`: 初回トーナメント運用仕様
- `docs/PHASE10_CREATOR_INVITE.md`: Creator 向け案内文
- `docs/PHASE10_SUMMARY.md`: 初回運用のまとめ
- `docs/PHASE8_B_ADMIN_ARENA_SUMMARY.md`: Admin / Tournament Ops Console の実装まとめ

