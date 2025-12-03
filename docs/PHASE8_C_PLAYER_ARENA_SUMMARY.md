# Phase 8-C: Arena / Tournament プレイヤー体験 (Creator / LP 連携) 実装まとめ

最終更新: 2025-01-30

このドキュメントは、Phase 8-C で実装した Arena / Tournament プレイヤー体験（Creator / LP 連携）の仕様と実装状況をまとめたものです。

---

## 📋 目次

1. [実装した画面](#実装した画面)
2. [実装したコンポーネント](#実装したコンポーネント)
3. [実装したユーティリティ](#実装したユーティリティ)
4. [既知の制約（MVP）](#既知の制約mvp)
5. [将来の拡張アイデア](#将来の拡張アイデア)

---

## 実装した画面

### 1. Creator Dashboard (`/dashboard`)

**ファイル**: `src/app/dashboard/DashboardClient.tsx`

**CurrentTournamentCard の改善**:
- ✅ 詳細リンク（`/arena/[slug]` へ）
- ✅ 未参加時のCTA（「商品一覧へ」ボタン）
- ✅ 状態に応じたメッセージ（参加中 / 未参加 / scheduled / finished / トーナメントなし）

**表示項目**:
- トーナメント名
- 現在の順位（参加中の場合）
- 売上金額
- 推定報酬
- トーナメントステータス

### 2. Tournament Leaderboard ページ (`/arena/[slug]`)

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

**エンプティステート**:
- ランキングが空 → 「まだ誰もスコアを出していません」「最初の参加者になりましょう」

### 3. Landing Page (`/`)

**ファイル**: `src/components/sections/Hero.tsx`

**改善内容**:
- ✅ モックデータを使用する構造にリファクタ
- ✅ `getLandingArenaHighlight()` 関数を使用
- ✅ 将来的に実データに差し替え可能なコメントを追加

**表示項目**:
- Current Rank（例: "#07 / NIGHT TOURNAMENT"）
- Est. Reward（例: "¥12,400"）
- Active Battles（例: 8）
- Creators（例: 120+）
- GMV / 24h（例: +32%）
- Hot Message（例: "今夜のバトルが熱い！"）

---

## 実装したコンポーネント

### 1. CurrentTournamentCard

**ファイル**: `src/components/dashboard/creator/CurrentTournamentCard.tsx`

**改善内容**:
- ✅ 詳細リンク（`/arena/[slug]` へ）を追加
- ✅ 未参加時のCTA（「商品一覧へ」ボタン）を追加
- ✅ 状態に応じたメッセージを追加:
  - 参加中: 順位・売上・報酬を表示 + 詳細リンク
  - 未参加（live）: 「このトーナメントに参加していません」+ CTA
  - scheduled: 「開始予定: XX:YY」
  - finished: 「このバトルは終了しました」

**データ取得**:
- `/api/arena/tournaments?status=live` から「今のトーナメント」を1件取得
- `/api/arena/tournaments/[slug]/leaderboard` から自分の順位を抽出

### 2. TournamentLeaderboardClient

**ファイル**: `src/app/arena/[slug]/TournamentLeaderboardClient.tsx`

**機能**:
- ✅ トーナメント情報の表示
- ✅ ランキング表示（上位20件）
- ✅ 自分の順位のハイライト
- ✅ エンプティステートのコピー
- ✅ エラーハンドリング

**データ取得**:
- `/api/arena/tournaments/[slug]` からトーナメント詳細を取得
- `/api/arena/tournaments/[slug]/leaderboard?limit=20` からランキングを取得

---

## 実装したユーティリティ

### 1. landing-mock.ts

**ファイル**: `src/lib/arena/landing-mock.ts`

**関数**:
- `getLandingArenaHighlight()`: モックデータを返す（MVP）
- `getLandingArenaHighlightFromRealData()`: 実データから情報を構築（将来実装）

**目的**:
- LP（Landing Page）で表示するトーナメント情報を提供
- MVP ではモックデータを使用
- 将来的には実データに差し替え可能な構造

**返却値**:
```typescript
{
  tournamentName: string;
  currentRank: number;
  estimatedReward: number;
  activeBattles: number;
  activeCreators: number;
  gmv24hChange: number;
  hotMessage: string;
  clickRateChange: number;
}
```

---

## 既知の制約（MVP）

### 1. プレイヤーが参加トーナメントを選ぶ UI

- MVP では実装していない
- 現在は「最初の live トーナメント」を自動的に表示
- 将来的には複数トーナメントから選択できるUIを追加予定

### 2. 複数トーナメント同時参加

- MVP では対応していない
- 現在は1つのトーナメントのみ表示
- 将来的には複数トーナメントの同時参加をサポート予定

### 3. トーナメントの詳細ページ

- 報酬情報、ルール説明などの詳細ページは未実装
- 現在はランキングページのみ
- 将来的には詳細ページを追加予定

### 4. リアルタイム更新

- 現在は手動リロードが必要
- 将来的には WebSocket / Server-Sent Events でリアルタイム更新を実装予定

### 5. LP の実データ化

- 現在はモックデータを使用
- 将来的には実データ（`tournaments` テーブル + `leaderboard` API）から取得するように変更予定

---

## 将来の拡張アイデア

### 1. プレイヤーが参加トーナメントを選ぶ UI

**実装方針**:
- Creator Dashboard に「参加可能なトーナメント一覧」を表示
- 各トーナメントの「参加する」ボタンを追加
- 参加中のトーナメントを複数表示

### 2. 複数トーナメント同時参加

**実装方針**:
- `CurrentTournamentCard` を複数表示可能にする
- または、タブで切り替え可能にする
- 各トーナメントの順位・売上・報酬を個別に表示

### 3. トーナメントの詳細ページ

**実装方針**:
- `/arena/[slug]/detail` ページを作成
- 報酬情報、ルール説明、過去の結果などを表示
- 参加条件や注意事項を明記

### 4. リアルタイム更新

**実装方針**:
- Supabase Realtime を使用してランキングをリアルタイム更新
- WebSocket / Server-Sent Events で順位変動を通知
- アニメーションで順位変動を視覚的に表示

### 5. LP の実データ化

**実装方針**:
- `getLandingArenaHighlight()` を実装し、`createServerSupabaseClient()` で
  現在 live のトーナメントを取得
- `leaderboard` API を叩いて、ダミーのプレイヤー情報を混ぜつつ表示
- または、実際のログインユーザーの情報を表示（認証済みの場合）

---

## 実装ファイル一覧

### ドキュメント
- `docs/PHASE8_C_PLAYER_ARENA_PLAN.md`: 実装計画
- `docs/PHASE8_C_PLAYER_ARENA_SUMMARY.md`: 実装まとめ（このファイル）

### コンポーネント
- `src/components/dashboard/creator/CurrentTournamentCard.tsx`: トーナメントカード（改善）
- `src/components/sections/Hero.tsx`: LP の Hero セクション（モックデータ対応）

### ページ
- `src/app/arena/[slug]/page.tsx`: トーナメントランキングページ（Server Component）
- `src/app/arena/[slug]/TournamentLeaderboardClient.tsx`: トーナメントランキングページ（Client Component）

### ユーティリティ
- `src/lib/arena/landing-mock.ts`: LP 用のモックデータ生成関数

### コピー
- `src/lib/copy.ts`: `noteMock` のコピーを更新

---

## 関連ドキュメント

- `docs/PHASE8_ARENA_PLAN.md`: Arena / Tournament MVP の実装計画
- `docs/PHASE8_ARENA_SUMMARY.md`: Arena / Tournament MVP の実装まとめ
- `docs/PHASE8_B_ADMIN_ARENA_PLAN.md`: Admin / Tournament Ops Console の実装計画
- `docs/PHASE8_B_ADMIN_ARENA_SUMMARY.md`: Admin / Tournament Ops Console の実装まとめ

---

## まとめ

Phase 8-C では、以下の機能を実装しました:

1. ✅ **C-1: Creator Dashboard 上のアリーナ体験の仕上げ**: `CurrentTournamentCard` の改善（詳細リンク、未参加時のCTA、状態に応じたメッセージ）
2. ✅ **C-2: Ranking / Leaderboard UI のプレイヤー向け整理**: `/arena/[slug]` ページの実装（ログイン不要のパブリックビュー、ランキング表示、自分の順位のハイライト）
3. ✅ **C-3: LP との連携（Tonight Battle / Current Rank の実データ or よりリアルなモック）**: `landing-mock.ts` を作成し、`Hero.tsx` をモックデータを使用する構造にリファクタ
4. ✅ **C-4: エンプティステート / エラーステート / トーナメント状態のコピー整理**: 状態パターンごとのコピーを整理、画面ごとのコピーを整える
5. ✅ **C-5: ドキュメント & 最終確認**: 実装計画とまとめドキュメントを作成

**現在の実装レベル**: MVP（最小限の機能）
**次のステップ**: プレイヤーが参加トーナメントを選ぶ UI、複数トーナメント同時参加、トーナメントの詳細ページ、リアルタイム更新、LP の実データ化

