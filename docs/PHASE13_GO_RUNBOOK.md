# Phase 13-GO: NIGHT BATTLE #02 実施 Runbook

最終更新: [YYYY-MM-DD]

このドキュメントは、判断結果「GO」に基づき、NIGHT BATTLE #02 を安全に再実施するための Runbook です。

---

## 📋 前提条件

- `docs/PHASE12_DECISION.md` で「GO」が選択されている
- A問題（致命）が存在しない
- Creator が「またやりたい」と言っている
- 運用プロセスが回る

---

## 今回変えない点

### 運用手順
- ✅ Phase 11 と同じ運用手順を使用
- ✅ 手動ステータス変更（SQL を使用）
- ✅ 日次監視タスク（1日1回）
- ✅ Creator への案内方法

### システム構成
- ✅ 同じ Supabase プロジェクトを使用
- ✅ 同じ Stripe テストキーを使用
- ✅ 同じ Admin / Creator アカウントを使用

### トーナメント仕様
- ✅ 期間: 72時間（3日間）
- ✅ 参加 Creator 数: 5名程度
- ✅ 商品数: 1-2商品

---

## 変更点（最小限）

### トーナメント情報
- **トーナメント名**: NIGHT BATTLE #01 → **NIGHT BATTLE #02**
- **Slug**: `night-battle-01` → **`night-battle-02`**
- **実施期間**: [開始日時] 〜 [終了日時]（#01 とは異なる日時）

### Creator 案内文
- 日付を #02 の実施期間に更新
- トーナメント名を「NIGHT BATTLE #02」に更新
- その他の内容は `docs/PHASE10_CREATOR_INVITE.md` と同じ

---

## Step A: 本番開始前チェック（Preflight）

### A-1. Supabase 環境確認

- [ ] Supabase Dashboard で本番プロジェクト（SellRush 本番）に接続していることを確認
- [ ] Admin ユーザーが存在し、`user_metadata.role = "admin"` が設定されている
- [ ] Creator ユーザー（参加予定者）が存在し、`user_metadata.role = "creator"` が設定されている
- [ ] `tournaments` テーブルに既存の `live` トーナメントがないことを確認

### A-2. トーナメント準備

**トーナメント作成 SQL**:
```sql
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
  'NIGHT BATTLE #02',
  'night-battle-02',
  'scheduled',
  '<開始日時>',  -- 例: '2025-02-08 20:00:00+09'
  '<終了日時>',  -- 例: '2025-02-11 20:00:00+09'
  NULL,         -- 必要に応じて商品IDを設定
  '<ADMIN_USER_ID>'
);
```

- [ ] トーナメントが正常に作成された
- [ ] `slug = 'night-battle-02'` が設定されている
- [ ] `status = 'scheduled'` が設定されている

### A-3. 表示確認

- [ ] Admin 画面（`/admin/arena/tournaments`）でトーナメントが表示される
- [ ] Admin 詳細ページ（`/admin/arena/tournaments/night-battle-02`）で情報が正しく表示される
- [ ] Creator Dashboard（`/dashboard`）でトーナメント情報が表示される（scheduled 状態）
- [ ] Arena Page（`/arena/night-battle-02`）が正常に表示される

### A-4. 決済安全チェック

- [ ] Vercel の環境変数で `STRIPE_SECRET_KEY` がテストキー（`sk_test_...`）であることを確認

---

## Step B: トーナメント開始（Go Live）

### B-1. 開始操作

**ステータス変更 SQL**:
```sql
UPDATE tournaments
SET status = 'live',
    updated_at = now()
WHERE slug = 'night-battle-02';
```

- [ ] ステータスを `scheduled` → `live` に変更
- [ ] 変更時刻を記録: [YYYY-MM-DD HH:MM:SS]

### B-2. 即時確認（開始後5分以内）

- [ ] LP（`/`）の Arena 表示が更新されている
- [ ] Creator Dashboard の `CurrentTournamentCard` が「今夜のバトル参加中」系の表示になっている
- [ ] Arena Page（`/arena/night-battle-02`）が正常に表示される

### B-3. 初期異常チェック（開始後30分以内）

- [ ] ランキングが空でも画面が落ちない
- [ ] API エラーが発生していない（Vercel Logs を確認）
- [ ] `fraud_flags` テーブルに異常な増加がない

---

## Step C: 開催中運用（1日1回）

### C-1. 毎日確認項目（推奨時刻: 午前中）

- [ ] `orders` テーブルの新規注文数を確認
- [ ] `/arena/night-battle-02` のランキングが正しく更新されている
- [ ] `fraud_flags` テーブルに新規フラグがないか確認
- [ ] Creator からの問い合わせがないか確認

### C-2. 手動対応ルール

- [ ] 明らかな不正が発見された場合、Creator に一時停止依頼を送信
- [ ] バグが発見された場合、`docs/BUGLOG.md` に即記録（修正は後回し）

---

## Step D: 終了処理

### D-1. 終了操作

**ステータス変更 SQL**:
```sql
UPDATE tournaments
SET status = 'finished',
    updated_at = now()
WHERE slug = 'night-battle-02';
```

- [ ] ステータスを `live` → `finished` に変更
- [ ] 終了時刻を記録: [YYYY-MM-DD HH:MM:SS]

### D-2. 表示確認

- [ ] Creator Dashboard の表示が「終了」状態に変わる
- [ ] Arena Page が正常に表示される（終了状態のコピーが表示される）

---

## Step E: 振り返り

### E-1. 結果記録

- [ ] `docs/PHASE11_LIVE_REPORT.md` を #02 用にコピーして記録
- [ ] 実施期間、参加 Creator 数、総注文件数などを記録
- [ ] 想定外だった挙動、問題、Creator からのフィードバックを記録

### E-2. 次フェーズの判断

- [ ] `docs/PHASE12_DECISION.md` を #02 用に作成して判断を記録

---

## Creator 案内文（#02 用）

### 参加依頼メール（Day -1）

**件名**: 【SELL RUSH】「NIGHT BATTLE #02」ご参加のお願い

**本文**:
[Creator名]様

いつもお世話になっております。SELL RUSH 運営事務局です。

この度、「NIGHT BATTLE #02」を開催することになりました。
つきましては、[Creator名]様にぜひご参加いただきたく、ご連絡いたしました。

**【NIGHT BATTLE #02 概要】**
- **トーナメント名**: NIGHT BATTLE #02
- **期間**: [開始日時] 〜 [終了日時]
- **対象商品**: [商品名]（商品URL: [商品URL]）

**【ご参加方法】**
1. SELL RUSH にログインし、対象商品の紹介リンクを発行してください。
2. ご自身の SNS で紹介リンクを投稿し、商品を販売してください。
3. ダッシュボードや Arena ページで、ご自身の売上やランキングをご確認いただけます。

**【Arena ページ】**
トーナメントのランキングは以下のページでご確認いただけます。
[ArenaページURL]（例: `https://sellrush.vercel.app/arena/night-battle-02`）

ご多忙の折恐縮ですが、ご検討いただけますと幸いです。
ご参加いただける場合は、本メールにご返信ください。

よろしくお願いいたします。

---
SELL RUSH 運営事務局
[連絡先情報]
---

### 開始通知メール（Day 0）

**件名**: 【SELL RUSH】「NIGHT BATTLE #02」が開始されました！

**本文**:
[Creator名]様

SELL RUSH 運営事務局です。

本日 [開始日時] より、「NIGHT BATTLE #02」が開始されました！

**【トーナメント概要】**
- **トーナメント名**: NIGHT BATTLE #02
- **期間**: [開始日時] 〜 [終了日時]
- **対象商品**: [商品名]（商品URL: [商品URL]）

**【ご参加方法】**
- SELL RUSH にログインし、対象商品の紹介リンクを投稿してください。
- ダッシュボードでリアルタイムの売上やランキングをご確認いただけます。

**【Arena ページ】**
現在のランキングは以下のページでご確認いただけます。
[ArenaページURL]

皆様のご参加を心よりお待ちしております！

---
SELL RUSH 運営事務局
[連絡先情報]
---

### 終了通知メール（Day +3）

**件名**: 【SELL RUSH】「NIGHT BATTLE #02」が終了しました！

**本文**:
[Creator名]様

SELL RUSH 運営事務局です。

「NIGHT BATTLE #02」は、本日 [終了日時] をもちまして無事終了いたしました。
ご参加いただいた皆様、誠にありがとうございました！

**【最終結果】**
最終ランキングは以下のページでご確認いただけます。
[ArenaページURL]

[Creator名]様の最終順位は **[最終順位]位** でした！

**【フィードバックのお願い】**
今回のトーナメントを通じて、システムや UI、運用プロセスに関して多くの学びがありました。
つきましては、[Creator名]様が実際に使ってみて感じたこと、改善点、バグなど、どんな些細なことでも構いませんので、ぜひフィードバックをお寄せください。

[フィードバックフォームURL / フィードバック窓口]

皆様からの貴重なご意見は、今後の SELL RUSH の改善に不可欠です。
ご協力いただけますよう、何卒よろしくお願い申し上げます。

---
SELL RUSH 運営事務局
[連絡先情報]
---

---

## 関連ドキュメント

- [docs/PHASE11_LIVE_OPERATION.md](docs/PHASE11_LIVE_OPERATION.md): 本番運用実施手順書（#01 用）
- [docs/PHASE12_DECISION.md](docs/PHASE12_DECISION.md): 判断ドキュメント
- [docs/PHASE10_CREATOR_INVITE.md](docs/PHASE10_CREATOR_INVITE.md): Creator 向け案内文（テンプレート）
- [docs/PRODUCTION_DRY_RUN_SQL.md](docs/PRODUCTION_DRY_RUN_SQL.md): SQL クエリ集

