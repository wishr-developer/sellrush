# Phase 8-C: Arena / Tournament プレイヤー体験 (Creator / LP 連携) 実装計画

最終更新: 2025-01-30

## 📋 目次

1. [目的](#目的)
2. [範囲](#範囲)
3. [Creator Dashboard での表示内容](#creator-dashboard-での表示内容)
4. [Ranking ページの仕様](#ranking-ページの仕様)
5. [LP との連携方針](#lp-との連携方針)
6. [エンプティステート / エラーステート](#エンプティステート--エラーステート)
7. [実装タスク](#実装タスク)

---

## 目的

Creator / Player 向けのアリーナ体験（UI/UX）と LP 連携を仕上げる。

- Creator Dashboard に「今参加している／参加可能なトーナメント」の情報を分かりやすく表示
- トーナメント専用のランキングページを提供
- LP（Landing Page）の Tonight Battle / Current Rank を実データ or よりリアルなモックに差し替え可能な構造にする
- エンプティステート / エラーステート / トーナメント状態のコピーを整理

---

## 範囲

### MVP で実装する機能

1. **Creator Dashboard 上のアリーナ体験の仕上げ**
   - `CurrentTournamentCard` の改善（詳細リンク、未参加時のCTA）
   - 状態に応じたメッセージ（参加中 / 未参加 / トーナメントなし）

2. **Ranking / Leaderboard UI のプレイヤー向け整理**
   - `/arena/[slug]` ページの実装（ログイン不要のパブリックビュー）
   - ランキング表示（上位20件）
   - 自分の順位のハイライト

3. **LP との連携（Tonight Battle / Current Rank の実データ or よりリアルなモック）**
   - `src/lib/arena/landing-mock.ts` を作成
   - `Hero.tsx` をモックデータを使用する構造にリファクタ
   - 将来的に実データに差し替え可能なコメントを追加

4. **エンプティステート / エラーステート / トーナメント状態のコピー整理**
   - 状態パターンごとのコピーを整理
   - 画面ごとのコピーを整える

### 将来の拡張（MVPでは実装しない）

- プレイヤーが参加トーナメントを選ぶ UI
- 複数トーナメント同時参加
- トーナメントの詳細ページ（報酬情報、ルール説明など）
- リアルタイム更新（WebSocket / Server-Sent Events）

---

## Creator Dashboard での表示内容

### CurrentTournamentCard の改善

**ファイル**: `src/components/dashboard/creator/CurrentTournamentCard.tsx`

**表示項目**:
- トーナメント名（例: "NIGHT TOURNAMENT"）
- 現在の順位（例: "#07"）
- 売上金額
- 推定報酬（Est. Reward）
- トーナメントステータス（scheduled / live / finished）

**状態ごとの UX**:

1. **開催中 + 参加中**:
   - 現在順位 / 売上 / 推定報酬を表示
   - 「詳細を見る」リンクで `/arena/[slug]` へ飛ばす

2. **開催中 + 未参加**:
   - 「このトーナメントに参加していません」メッセージ
   - CTA ボタンで「商品一覧へ」（`/products`）リンク

3. **予定（scheduled）**:
   - 「開始予定: XX:YY」メッセージ
   - 「開始までお待ちください」コピー

4. **終了（finished）**:
   - 「このバトルは終了しました」メッセージ
   - 「次の開催をお待ちください」コピー

5. **トーナメントなし**:
   - 「開催中のトーナメントはありません」メッセージ
   - 「次のトーナメントをお待ちください」コピー

**データ取得**:
- `/api/arena/tournaments?status=live` から「今のトーナメント」を1件取得
- `/api/arena/tournaments/[slug]/leaderboard` から自分の順位を抽出

---

## Ranking ページの仕様

### `/arena/[slug]` ページ

**ファイル**:
- `src/app/arena/[slug]/page.tsx`（Server Component）
- `src/app/arena/[slug]/TournamentLeaderboardClient.tsx`（Client Component）

**表示項目**:
- トーナメント情報:
  - タイトル
  - 説明
  - ステータス（scheduled / live / finished）
  - 期間（開始時刻 / 終了時刻）
- 統計情報:
  - 参加者数
  - 総売上
- ランキング:
  - 順位（1〜20位）
  - Creator 名（`influencerName` / 匿名ID）
  - 売上金額
  - 注文件数
  - 自分の行（current user）はハイライト

**認証**:
- ログイン不要で閲覧可能（パブリックビュー）
- ログイン済みの場合は自分の順位も表示

**データ取得**:
- `/api/arena/tournaments/[slug]` からトーナメント詳細を取得
- `/api/arena/tournaments/[slug]/leaderboard?limit=20` からランキングを取得

**エンプティステート**:
- まだ誰もスコアを出していない場合 → 「まだ誰もスコアを出していません」メッセージ

---

## LP との連携方針

### 実装方針（MVP）

**Option B: モックだが将来差し替えやすい構造にする（MVPはこちら推奨）**

- `src/lib/arena/landing-mock.ts` を作成
- `getLandingArenaHighlight()` 関数を用意:
  - 「今夜のバトル名」
  - 「Active Battles 数」
  - 「例としてのランク・報酬」などを返す
- LP 側（`Hero.tsx`）はこの関数を呼ぶ形にリファクタ
- 後から本番用の実データロジックに差し替えやすいようにコメントを残す

### 将来の実データ化（Option A）

将来的には実データを取りに行く:

1. `createServerSupabaseClient()` で「現在 live のトーナメント」を1つピックアップ
2. `leaderboard` API を叩いて、ダミーのプレイヤー情報を混ぜつつ表示

**実装ファイル**: `src/lib/arena/landing-mock.ts`

**関数**:
- `getLandingArenaHighlight()`: モックデータを返す（MVP）
- `getLandingArenaHighlightFromRealData()`: 実データから情報を構築（将来実装）

---

## エンプティステート / エラーステート

### 状態パターン

1. **トーナメントが存在しない（今は開催していない）**
   - Creator Dashboard: 「開催中のトーナメントはありません」「次のトーナメントをお待ちください」
   - LP: モックデータを使用（常に表示）

2. **まだ開始前（scheduled）**
   - Creator Dashboard: 「開始予定: XX:YY」「開始までお待ちください」
   - Ranking ページ: トーナメント情報を表示、ランキングは空状態

3. **開催中（live）**
   - Creator Dashboard: 参加中なら順位・売上・報酬を表示、未参加ならCTAを表示
   - Ranking ページ: ランキングを表示

4. **終了（finished）**
   - Creator Dashboard: 「このバトルは終了しました」「次の開催をお待ちください」
   - Ranking ページ: 最終ランキングを表示

### 画面ごとのコピー

**Creator Dashboard**:
- `live` で参加中 → 「今夜のバトルであなたは #3 位、推定報酬は…」
- `live` で未参加 → 「このトーナメントに参加していません。商品を選んでバトルに参加しましょう。」
- `scheduled` → 「XX:YY に開始予定です」
- `finished` → 「このバトルは終了しました。次の開催をお待ちください。」

**Ranking ページ**:
- ランキングが空 → 「まだ誰もスコアを出していません」「最初の参加者になりましょう」
- エラー → 「トーナメントが見つかりません」+ トップに戻るリンク

**LP**:
- 常にモックデータを表示（デモ表示の旨を明記）

---

## 実装タスク

### C-1: Creator Dashboard 上のアリーナ体験の仕上げ ✅

- [x] `CurrentTournamentCard` の改善（詳細リンク、未参加時のCTA）
- [x] 状態に応じたメッセージ（参加中 / 未参加 / scheduled / finished / トーナメントなし）

### C-2: Ranking / Leaderboard UI のプレイヤー向け整理 ✅

- [x] `/arena/[slug]` ページの実装（ログイン不要のパブリックビュー）
- [x] ランキング表示（上位20件）
- [x] 自分の順位のハイライト
- [x] エンプティステートのコピー

### C-3: LP との連携（Tonight Battle / Current Rank の実データ or よりリアルなモック） ✅

- [x] `src/lib/arena/landing-mock.ts` を作成
- [x] `Hero.tsx` をモックデータを使用する構造にリファクタ
- [x] 将来的に実データに差し替え可能なコメントを追加

### C-4: エンプティステート / エラーステート / トーナメント状態のコピー整理 ✅

- [x] 状態パターンごとのコピーを整理
- [x] 画面ごとのコピーを整える
- [x] `copy.ts` の `noteMock` を更新

### C-5: ドキュメント & 最終確認 ✅

- [x] `docs/PHASE8_C_PLAYER_ARENA_PLAN.md` を作成
- [x] `docs/PHASE8_C_PLAYER_ARENA_SUMMARY.md` を作成
- [x] ビルド & 型チェック確認

---

## 関連ドキュメント

- `docs/PHASE8_ARENA_PLAN.md`: Arena / Tournament MVP の実装計画
- `docs/PHASE8_ARENA_SUMMARY.md`: Arena / Tournament MVP の実装まとめ
- `docs/PHASE8_B_ADMIN_ARENA_PLAN.md`: Admin / Tournament Ops Console の実装計画
- `docs/PHASE8_B_ADMIN_ARENA_SUMMARY.md`: Admin / Tournament Ops Console の実装まとめ

