# Phase 8-B: Admin / Tournament Ops Console 実装まとめ

最終更新: 2025-01-30

このドキュメントは、Phase 8-B で実装した Admin / Tournament Ops Console の仕様と実装状況をまとめたものです。

---

## 📋 目次

1. [実装した画面](#実装した画面)
2. [実装した API Routes](#実装した-api-routes)
3. [認証・権限管理](#認証権限管理)
4. [既知の制約（MVP）](#既知の制約mvp)
5. [将来の拡張アイデア](#将来の拡張アイデア)

---

## 実装した画面

### 1. Admin Dashboard (`/admin`)

**ファイル**: `src/app/admin/AdminDashboardClient.tsx`

**ナビゲーション**:
- Orders（主導線）
- Payouts, Fraud, Users, **Arena**（副導線）

**Arena へのリンク**: `/admin/arena/tournaments`（188-192行目）

### 2. Tournament 一覧ページ (`/admin/arena/tournaments`)

**ファイル**:
- `src/app/admin/arena/tournaments/page.tsx`（Server Component）
- `src/app/admin/arena/tournaments/AdminTournamentsClient.tsx`（Client Component）

**表示項目**:
- トーナメント名（title）
- Slug
- ステータス（scheduled / live / finished）
- 期間（start_at / end_at）
- 対象商品ID（product_id）

**機能**:
- ✅ ステータス別フィルタ（all / scheduled / live / finished）
- ✅ 各トーナメントの「詳細」ボタン（`/admin/arena/tournaments/[slug]` へ）
- ✅ 各トーナメントの「編集」ボタン（`/admin/arena/tournaments/[slug]/edit` へ）
- ✅ 新規作成ボタン（`/admin/arena/tournaments/new` へ、将来実装）

**認証**:
- Admin ロールのみアクセス可能
- 認証失敗時は `/login` へリダイレクト

### 3. Tournament 詳細・編集ページ (`/admin/arena/tournaments/[slug]`)

**ファイル**:
- `src/app/admin/arena/tournaments/[slug]/page.tsx`（Server Component）
- `src/app/admin/arena/tournaments/[slug]/AdminTournamentDetailClient.tsx`（Client Component）

**表示項目**:
- 基本情報:
  - タイトル（title）
  - 説明（description）
  - ステータス（status）
  - 開始時刻（start_at）
  - 終了時刻（end_at）
  - 対象商品（product_id / product_name）

**編集機能**:
- ✅ 編集モードの切り替え
- ✅ フォームによる情報更新（title, description, status, start_at, end_at, product_id）
- ✅ 保存ボタン（PATCH API を呼び出し）

**ランキング表示**:
- ✅ Current Leaderboard（上位10件）
- ✅ 順位、インフルエンサーID、注文件数、売上金額

**統計情報**:
- ✅ 参加者数
- ✅ 総売上

**認証**:
- Admin ロールのみアクセス可能
- 認証失敗時は `/login` へリダイレクト

---

## 実装した API Routes

### 1. `GET /api/admin/tournaments`

**ファイル**: `src/app/api/admin/tournaments/route.ts`

**役割**: トーナメント一覧を取得（Admin view 用）

**クエリパラメータ**:
- `status`（任意）: `scheduled` | `live` | `finished`
- `product_id`（任意）: 特定商品のトーナメントをフィルタ

**レスポンス**:
```typescript
{
  tournaments: Tournament[]
}
```

**ロールチェック**: `admin` ロールのみ

### 2. `POST /api/admin/tournaments`

**ファイル**: `src/app/api/admin/tournaments/route.ts`

**役割**: 新規トーナメント作成

**リクエストボディ**:
```typescript
{
  title: string; // 必須
  slug: string; // 必須、ユニーク
  description?: string;
  status?: 'scheduled' | 'live' | 'finished'; // デフォルト: 'scheduled'
  startAt: string; // ISO 8601, 必須
  endAt: string; // ISO 8601, 必須
  productId?: string; // UUID
}
```

**レスポンス**:
```typescript
{
  tournament: Tournament
}
```

**ロールチェック**: `admin` ロールのみ

**バリデーション**:
- `title` と `slug` は必須
- `startAt` と `endAt` は必須
- `endAt` は `startAt` より後である必要がある
- `slug` の重複チェック

### 3. `GET /api/admin/tournaments/[slug]`

**ファイル**: `src/app/api/admin/tournaments/[slug]/route.ts`

**役割**: トーナメント詳細を取得

**パスパラメータ**:
- `slug`: トーナメントの slug

**レスポンス**:
```typescript
{
  tournament: TournamentWithProduct
}
```

**ロールチェック**: `admin` ロールのみ

### 4. `PATCH /api/admin/tournaments/[slug]`

**ファイル**: `src/app/api/admin/tournaments/[slug]/route.ts`

**役割**: トーナメント更新

**パスパラメータ**:
- `slug`: トーナメントの slug

**リクエストボディ**（すべてオプション）:
```typescript
{
  title?: string;
  description?: string | null;
  status?: 'scheduled' | 'live' | 'finished';
  startAt?: string; // ISO 8601
  endAt?: string; // ISO 8601
  productId?: string | null; // UUID
}
```

**レスポンス**:
```typescript
{
  tournament: TournamentWithProduct
}
```

**ロールチェック**: `admin` ロールのみ

**バリデーション**:
- `status` は 'scheduled', 'live', 'finished' のいずれか
- `startAt` と `endAt` の日付形式チェック
- `endAt` は `startAt` より後である必要がある（既存の値と比較）

---

## 認証・権限管理

### ページ側のガード

**実装パターン**:
既存の Admin ページ（`AdminOrdersClient`, `AdminPayoutsClient` など）と同じパターンを使用:

```typescript
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user || user.user_metadata?.role !== "admin") {
  router.replace("/login");
  return;
}
```

**実装箇所**:
- `src/app/admin/arena/tournaments/AdminTournamentsClient.tsx`（36-58行目）
- `src/app/admin/arena/tournaments/[slug]/AdminTournamentDetailClient.tsx`（58-83行目）

### API 側のロールチェック

**実装パターン**:
既存の Admin API（`/api/admin/users` など）と同じパターンを使用:

```typescript
const supabase = createApiSupabaseClient(request);

const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();

if (userError || !user) {
  return unauthorizedError("Authentication required");
}

if (user.user_metadata?.role !== "admin") {
  return forbiddenError("Admin access required");
}
```

**実装箇所**:
- `src/app/api/admin/tournaments/route.ts`（GET: 28-41行目、POST: 117-130行目）
- `src/app/api/admin/tournaments/[slug]/route.ts`（GET: 32-45行目、PATCH: 129-142行目）

---

## 既知の制約（MVP）

### 1. トーナメントの削除機能

- MVP では実装していない
- 将来的には `DELETE /api/admin/tournaments/[slug]` を追加予定

### 2. 新規作成画面

- 一覧ページに「新規作成」ボタンはあるが、`/admin/arena/tournaments/new` ページは未実装
- 現在は API を直接呼び出す必要がある
- 将来的には新規作成フォームページを追加予定

### 3. 複雑なスケジューリング

- 現在は手動で `start_at` と `end_at` を設定
- 将来的には繰り返しスケジュール、自動開始/終了などの機能を追加予定

### 4. マルチ賞金設計

- 現在は報酬見込みのみ表示
- 将来的には `tournament_rewards` テーブルを追加して賞金ロジックを実装予定

### 5. 一括操作

- 複数トーナメントの状態を一括変更する機能は未実装
- 将来的には一括操作UIを追加予定

---

## 将来の拡張アイデア

### 1. トーナメントの削除機能

**実装方針**:
- `DELETE /api/admin/tournaments/[slug]` を追加
- 削除前に確認ダイアログを表示
- 関連するランキングデータの扱いを決定（削除 or アーカイブ）

### 2. 新規作成フォームページ

**実装方針**:
- `/admin/arena/tournaments/new` ページを作成
- フォームによる新規トーナメント作成
- Slug の自動生成オプション

### 3. 複雑なスケジューリング

**実装方針**:
- 繰り返しスケジュール（毎日、毎週など）
- 自動開始/終了（Cron Job または Supabase Edge Functions）
- スケジュールテンプレート機能

### 4. マルチ賞金設計

**実装方針**:
- `tournament_rewards` テーブルを追加
- 順位別の賞金額設定
- 賞金支払いの自動化

### 5. 一括操作

**実装方針**:
- 複数トーナメントの選択機能
- 一括状態変更（scheduled → live など）
- 一括削除（確認ダイアログ付き）

### 6. トーナメントの複製機能

**実装方針**:
- 既存トーナメントをベースに新規トーナメントを作成
- Slug の自動生成
- 期間の調整機能

---

## 実装ファイル一覧

### ドキュメント
- `docs/PHASE8_B_ADMIN_ARENA_PLAN.md`: 実装計画
- `docs/PHASE8_B_ADMIN_ARENA_SUMMARY.md`: 実装まとめ（このファイル）

### レイアウト
- `src/app/admin/arena/layout.tsx`: Arena 用レイアウト

### ページ（Server Components）
- `src/app/admin/arena/tournaments/page.tsx`: トーナメント一覧ページ
- `src/app/admin/arena/tournaments/[slug]/page.tsx`: トーナメント詳細ページ

### クライアントコンポーネント
- `src/app/admin/arena/tournaments/AdminTournamentsClient.tsx`: トーナメント一覧のクライアントコンポーネント
- `src/app/admin/arena/tournaments/[slug]/AdminTournamentDetailClient.tsx`: トーナメント詳細のクライアントコンポーネント

### API Routes
- `src/app/api/admin/tournaments/route.ts`: トーナメント一覧・作成 API
- `src/app/api/admin/tournaments/[slug]/route.ts`: トーナメント詳細・更新 API

### 統合
- `src/app/admin/AdminDashboardClient.tsx`: Admin Dashboard に Arena へのナビゲーションリンクを追加（188-192行目）

---

## 関連ドキュメント

- `docs/PHASE8_ARENA_PLAN.md`: Arena / Tournament MVP の実装計画
- `docs/PHASE8_ARENA_SUMMARY.md`: Arena / Tournament MVP の実装まとめ
- `docs/PHASE6_AUTH_PLAN.md`: ロール & 権限の定義

---

## まとめ

Phase 8-B では、以下の機能を実装しました:

1. ✅ **P8-B-1: Admin 用ルーティングとレイアウトの整理**: Arena 用レイアウトとナビゲーションリンクを追加
2. ✅ **P8-B-2: Tournament 一覧ページ（Admin 用）**: トーナメント一覧とフィルタ機能を実装
3. ✅ **P8-B-3: Tournament 詳細・編集ページ**: 詳細表示、編集機能、ランキング表示を実装
4. ✅ **P8-B-4: Admin 用 API Routes (CRUD / State 管理)**: GET, POST, PATCH API を実装
5. ✅ **P8-B-5: Auth / ガード処理と UX**: ページ側と API 側の両方でロールチェックを実装
6. ✅ **P8-B-6: ドキュメント & 最終確認**: 実装計画とまとめドキュメントを作成

**現在の実装レベル**: MVP（最小限の機能）
**次のステップ**: トーナメントの削除機能、新規作成フォームページ、複雑なスケジューリング、マルチ賞金設計、一括操作

