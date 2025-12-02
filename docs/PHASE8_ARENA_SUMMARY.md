# Phase 8-A: Arena / Tournament MVP 実装まとめ

最終更新: 2025-01-30

このドキュメントは、Phase 8-A で実装した Arena / Tournament 機能の仕様と実装状況をまとめたものです。

---

## 📋 目次

1. [実装したテーブル](#実装したテーブル)
2. [実装した API Routes](#実装した-api-routes)
3. [Creator / Brand Dashboard に追加されたコンポーネント](#creator--brand-dashboard-に追加されたコンポーネント)
4. [既知の制約（MVP）](#既知の制約mvp)
5. [将来の拡張アイデア](#将来の拡張アイデア)

---

## 実装したテーブル

### `tournaments` テーブル

**ファイル**: `supabase/migrations/20250130_create_tournaments.sql`

**カラム**:
- `id`: UUID（主キー）
- `slug`: TEXT（UIで使うID、例: "night-tournament-2025-01-30"）
- `title`: TEXT（トーナメント名）
- `description`: TEXT（説明文、オプション）
- `status`: TEXT（'scheduled' | 'live' | 'finished'）
- `start_at`: TIMESTAMPTZ（開始時刻）
- `end_at`: TIMESTAMPTZ（終了時刻）
- `product_id`: UUID（対象商品、`products` テーブルへの外部キー）
- `created_by`: UUID（作成者、`auth.users` への外部キー）
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

**インデックス**:
- `tournaments_status_idx`: `status` カラム
- `tournaments_product_id_idx`: `product_id` カラム
- `tournaments_start_at_idx`: `start_at` カラム
- `tournaments_end_at_idx`: `end_at` カラム
- `tournaments_slug_idx`: `slug` カラム（ユニーク）

**制約**:
- `tournaments_end_after_start`: 終了時刻は開始時刻より後である必要がある
- `tournaments_status_check`: `status` は 'scheduled', 'live', 'finished' のいずれか

**RLS ポリシー**:
- MVP では RLS ポリシーは実装せず、API Route 側でロールチェックを行う
- 将来的には RLS ポリシーを追加予定（`docs/PHASE8_ARENA_PLAN.md` に方針を記載）

---

## 実装した API Routes

### 1. `GET /api/arena/tournaments`

**ファイル**: `src/app/api/arena/tournaments/route.ts`

**役割**: 現在/直近のトーナメント一覧を返す

**クエリパラメータ**:
- `status`（任意）: `live` | `scheduled` | `finished`
- `product_id`（任意）: 特定商品のトーナメントをフィルタ

**レスポンス**:
```typescript
{
  tournaments: Tournament[]
}
```

**ロールチェック**:
- 認証済みユーザー: 全トーナメントを閲覧可能
- 未認証ユーザー: アクセス不可（将来は公開APIに変更可能）

### 2. `GET /api/arena/tournaments/[slug]`

**ファイル**: `src/app/api/arena/tournaments/[slug]/route.ts`

**役割**: 1つのトーナメント詳細を返す

**パスパラメータ**:
- `slug`: トーナメントの slug

**レスポンス**:
```typescript
{
  tournament: TournamentWithProduct
}
```

**ロールチェック**:
- 認証済みユーザー: 全トーナメントを閲覧可能
- 未認証ユーザー: アクセス不可（将来は公開APIに変更可能）

### 3. `GET /api/arena/tournaments/[slug]/leaderboard`

**ファイル**: `src/app/api/arena/tournaments/[slug]/leaderboard/route.ts`

**役割**: 指定トーナメントのランキングを返す

**パスパラメータ**:
- `slug`: トーナメントの slug

**クエリパラメータ**:
- `limit`（任意）: 取得件数（デフォルト: 20）

**レスポンス**:
```typescript
{
  tournament: Tournament;
  rankings: TournamentRankingRow[];
  myRank: number | null; // 認証済みユーザーの順位（未認証の場合は null）
}
```

**実装**:
1. `tournaments` テーブルから対象トーナメント取得
2. 期間（`start_at` 〜 `end_at`）と `product_id` で `orders` を取得（Service Role Key を使用して RLS をバイパス）
3. `buildTournamentRankingFromOrders` で集計・rank付与
4. 認証済みユーザーの順位を計算

**ロールチェック**:
- 未認証ユーザー: ランキングのみ閲覧可能（`myRank` は `null`）
- 認証済みユーザー: ランキング + 自分の順位を閲覧可能

---

## Creator / Brand Dashboard に追加されたコンポーネント

### Creator Dashboard

**コンポーネント**: `src/components/dashboard/creator/CurrentTournamentCard.tsx`

**表示項目**:
- トーナメント名（例: "NIGHT TOURNAMENT"）
- 現在の順位（例: "#07"）
- 推定報酬（Est. Reward）
- トーナメントステータス（scheduled / live / finished）

**データソース**:
- `/api/arena/tournaments?status=live` から「今のトーナメント」を1件取得
- `/api/arena/tournaments/[slug]/leaderboard` から自分の順位を抽出

**配置**:
- `src/app/dashboard/DashboardClient.tsx` の上部カードグリッドに追加
- 既存の「今夜のバトル」カードの前に配置

**ローディング/エラー状態**:
- Phase 4 のパターンを踏襲（`loadingState` / `errorState`）
- トーナメント未開催時: 「開催中のトーナメントはありません」と表示

### Brand Dashboard

**コンポーネント**: `src/components/dashboard/brand/TournamentOverviewCard.tsx`

**表示項目**:
- 自社商品のトーナメント一覧
- 参加クリエイター数（将来実装）
- 本日時点の売上合計（将来実装）
- トーナメントステータス（scheduled / live / finished）

**データソース**:
- `/api/arena/tournaments?product_id=<product_id>` から取得
- 複数商品に対応（各商品のトーナメントを取得して統合）

**配置**:
- `src/app/brand/dashboard/BrandDashboardClient.tsx` の KPI カードグリッドに追加

**ローディング/エラー状態**:
- Phase 4 のパターンを踏襲（`loadingState` / `errorState`）
- トーナメント未設定時: 「トーナメントはありません」と表示

---

## 既知の制約（MVP）

### 1. 1トーナメント = 1商品

- 複数商品のトーナメントは未対応
- 将来的には `tournament_products` テーブルを追加して対応予定

### 2. 明示的な参加登録不要

- 注文があれば自動参加
- 将来的には `tournament_entries` テーブルを追加して明示的な参加登録に対応予定

### 3. ランキング指標

- 売上金額（`orders.amount`）のみ
- クリック数・CVR は将来の指標として後回し

### 4. 賞金ロジック

- 報酬見込みのみ表示（`revenue-share.ts` を使用）
- 実際の賞金支払いは将来実装

### 5. RLS ポリシー

- API Route 側でロールチェック（RLS は将来実装）
- 将来的には RLS ポリシーを追加予定（`docs/PHASE8_ARENA_PLAN.md` に方針を記載）

### 6. インフルエンサー名の表示

- MVP では `influencerName` は `undefined`（将来実装）
- 将来的には `profiles` テーブルから取得予定

### 7. クリック数の集計

- MVP では `totalClicks` は `undefined`（将来実装）
- 将来的には `affiliate_links` テーブルから集計予定

---

## 将来の拡張アイデア

### 1. 複数商品のトーナメント

**実装方針**:
- `tournament_products` テーブルを追加
- `tournaments.product_id` を `null` にして、`tournament_products` で複数商品を紐付け

**例**:
```sql
create table tournament_products (
  tournament_id uuid references tournaments(id),
  product_id uuid references products(id),
  primary key (tournament_id, product_id)
);
```

### 2. チームバトル

**実装方針**:
- `tournament_teams` テーブルを追加
- `tournament_team_members` テーブルで Creator をチームに紐付け

**例**:
```sql
create table tournament_teams (
  id uuid primary key,
  tournament_id uuid references tournaments(id),
  name text not null,
  created_at timestamptz default now()
);

create table tournament_team_members (
  team_id uuid references tournament_teams(id),
  creator_id uuid references auth.users(id),
  primary key (team_id, creator_id)
);
```

### 3. 賞金ロジック

**実装方針**:
- `tournament_rewards` テーブルを追加
- `revenue-share.ts` と統合して賞金を計算

**例**:
```sql
create table tournament_rewards (
  id uuid primary key,
  tournament_id uuid references tournaments(id),
  rank_from integer not null,
  rank_to integer not null,
  reward_amount integer not null,
  reward_type text not null -- 'fixed' | 'percentage'
);
```

### 4. クリック数・CVR 指標

**実装方針**:
- `affiliate_links` テーブルに `click_count` カラムを追加
- `buildTournamentRankingFromOrders` を拡張してクリック数を集計

### 5. Fraud Radar との連携強化

**実装方針**:
- 不正検知された注文をランキングから除外
- `fraud_flags` テーブルと連携して、`reviewed = true` かつ `severity = 'high'` の注文を除外

### 6. リアルタイム更新

**実装方針**:
- Supabase Realtime でランキングをリアルタイム更新
- `orders` テーブルの変更を監視して、ランキングを自動更新

---

## 実装ファイル一覧

### ドキュメント
- `docs/PHASE8_ARENA_PLAN.md`: 実装計画
- `docs/PHASE8_ARENA_SUMMARY.md`: 実装まとめ（このファイル）

### データベース
- `supabase/migrations/20250130_create_tournaments.sql`: `tournaments` テーブルの定義

### 型定義
- `src/lib/arena/types.ts`: Arena / Tournament 関連の型定義

### ランキング計算
- `src/lib/arena/ranking.ts`: ランキング計算ロジック

### API Routes
- `src/app/api/arena/tournaments/route.ts`: トーナメント一覧 API
- `src/app/api/arena/tournaments/[slug]/route.ts`: トーナメント詳細 API
- `src/app/api/arena/tournaments/[slug]/leaderboard/route.ts`: ランキング API

### UI コンポーネント
- `src/components/dashboard/creator/CurrentTournamentCard.tsx`: Creator Dashboard 用トーナメントカード
- `src/components/dashboard/brand/TournamentOverviewCard.tsx`: Brand Dashboard 用トーナメント概要カード

### 統合
- `src/app/dashboard/DashboardClient.tsx`: Creator Dashboard に `CurrentTournamentCard` を統合
- `src/app/brand/dashboard/BrandDashboardClient.tsx`: Brand Dashboard に `TournamentOverviewCard` を統合

---

## 関連ドキュメント

- `docs/PHASE4_DASHBOARD_UX_PLAN.md`: Dashboard UI の設計パターン
- `docs/PHASE6_AUTH_PLAN.md`: ロール & 権限の定義
- `docs/PHASE7_PAYMENTS_PLAN.md`: 決済・報酬フローの設計

---

## まとめ

Phase 8-A では、以下の機能を実装しました:

1. ✅ **P8-A-1: ドメイン設計 & ドキュメント**: `docs/PHASE8_ARENA_PLAN.md` を作成
2. ✅ **P8-A-2: Supabase スキーマ**: `tournaments` テーブルを定義
3. ✅ **P8-A-3: ドメイン型 & ランキング計算**: `src/lib/arena/types.ts` と `src/lib/arena/ranking.ts` を作成
4. ✅ **P8-A-4: API Routes**: 3つの API Route を実装
5. ✅ **P8-A-5: Creator Dashboard 統合**: `CurrentTournamentCard` を追加
6. ✅ **P8-A-6: Brand Dashboard 統合**: `TournamentOverviewCard` を追加
7. ✅ **P8-A-7: ドキュメント & まとめ**: `docs/PHASE8_ARENA_SUMMARY.md` を作成

**現在の実装レベル**: MVP（最小限の機能）
**次のステップ**: 複数商品のトーナメント、チームバトル、賞金ロジック、クリック数・CVR 指標、Fraud Radar との連携強化、リアルタイム更新

