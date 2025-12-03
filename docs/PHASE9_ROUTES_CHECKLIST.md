# Phase 9-A: Routes Checklist

最終更新: 2025-01-30

このドキュメントは、Phase 9-A の QA / Bugfix & Stability Pass で確認した主要ルートの状態をまとめたものです。

---

## 主要ルート一覧

| Route Path | Purpose | Status | Notes |
|------------|---------|--------|-------|
| `/` | Landing Page (LP) | ✅ OK | `src/app/page.tsx` - Hero セクションでモックデータを使用 |
| `/login` | ログインページ | ✅ OK | `src/app/login/page.tsx` - 認証エラーハンドリングあり |
| `/dashboard` | Creator Dashboard | ✅ OK | `src/app/dashboard/page.tsx` - `DashboardClient.tsx` を使用、Suspense ラップ済み |
| `/brand/dashboard` | Brand Dashboard | ✅ OK | `src/app/brand/dashboard/page.tsx` - `BrandDashboardClient.tsx` を使用 |
| `/admin` | Admin Dashboard | ✅ OK | `src/app/admin/page.tsx` - Admin 専用 |
| `/admin/arena/tournaments` | Admin Tournament List | ✅ OK | `src/app/admin/arena/tournaments/page.tsx` - トーナメント一覧 |
| `/admin/arena/tournaments/[slug]` | Admin Tournament Detail | ✅ OK | `src/app/admin/arena/tournaments/[slug]/page.tsx` - トーナメント詳細・編集 |
| `/arena/[slug]` | Tournament Leaderboard (Public) | ✅ OK | `src/app/arena/[slug]/page.tsx` - ログイン不要のパブリックビュー |
| `/purchase` | Purchase Page | ✅ OK | `src/app/purchase/page.tsx` - `useSearchParams()` を Suspense でラップ済み |
| `/purchase/success` | Purchase Success Page | ✅ OK | `src/app/purchase/success/page.tsx` - `useSearchParams()` を Suspense でラップ済み |
| `/dashboard/orders` | Creator Orders View | ✅ OK | `src/app/dashboard/orders/page.tsx` - 注文一覧 |
| `/brand/products` | Brand Products Management | ✅ OK | `src/app/brand/products/page.tsx` - 商品管理 |
| `/products` | Public Products List | ✅ OK | `src/app/products/page.tsx` - 公開商品一覧 |
| `/market` | Market Page | ✅ OK | `src/app/market/page.tsx` - マーケットページ |
| `/settings` | Settings Page | ✅ OK | `src/app/settings/page.tsx` - 設定ページ |
| `/activate` | Account Activation | ✅ OK | `src/app/activate/page.tsx` - アカウント有効化 |

---

## API Routes 一覧

| Route Path | Method | Purpose | Status | Notes |
|------------|--------|---------|--------|-------|
| `/api/checkout/create` | POST | Stripe Checkout Session 作成 | ✅ OK | 公開API（認証不要）、統一エラーハンドリング使用 |
| `/api/stripe/webhook` | POST | Stripe Webhook 処理 | ✅ OK | 署名検証あり、統一エラーハンドリング使用 |
| `/api/orders/create` | POST | 注文作成 | ✅ OK | Creator/Influencer のみ、Rate Limit あり |
| `/api/affiliate-links/create` | POST | 紹介リンク作成 | ✅ OK | Creator/Influencer のみ、統一エラーハンドリング使用 |
| `/api/rankings` | GET | 全体ランキング | ✅ OK | 未認証でもアクセス可能、統一エラーハンドリング使用 |
| `/api/arena/tournaments` | GET | トーナメント一覧 | ✅ OK | 統一エラーハンドリング使用 |
| `/api/arena/tournaments/[slug]` | GET | トーナメント詳細 | ✅ OK | 統一エラーハンドリング使用 |
| `/api/arena/tournaments/[slug]/leaderboard` | GET | トーナメントランキング | ✅ OK | 未認証でもアクセス可能、統一エラーハンドリング使用 |
| `/api/brand/products` | GET, POST | 商品管理 | ✅ OK | Brand/Company のみ、統一エラーハンドリング使用 |
| `/api/admin/tournaments` | GET, POST | Admin Tournament CRUD | ✅ OK | Admin のみ、統一エラーハンドリング使用 |
| `/api/admin/tournaments/[slug]` | GET, PATCH | Admin Tournament Detail | ✅ OK | Admin のみ、統一エラーハンドリング使用 |
| `/api/admin/users` | GET | Admin Users List | ✅ OK | Admin のみ、統一エラーハンドリング使用 |
| `/api/fraud/detect` | POST | 不正検知 | ✅ OK | 内部呼び出し or Admin のみ、Rate Limit あり |
| `/api/payouts/generate` | POST | Payout 生成 | ✅ OK | Admin のみ、統一エラーハンドリング使用 |
| `/api/invitations/send` | POST | 招待メール送信 | ✅ OK | Admin のみ、統一エラーハンドリング使用 |

---

## 確認済み項目

### 1. useSearchParams() の Suspense ラップ

- ✅ `/purchase` - `PurchasePageInner` を `Suspense` でラップ済み
- ✅ `/purchase/success` - `PurchaseSuccessPageInner` を `Suspense` でラップ済み

### 2. エラーハンドリング

- ✅ すべての API Routes で統一エラーハンドリング（`api-error.ts`）を使用
- ✅ 環境変数のバリデーションあり（`env.ts`）
- ✅ Supabase クライアント生成の統一（`supabase-server.ts`）

### 3. 認証・認可

- ✅ Creator/Influencer 専用ルート: `/dashboard`, `/api/orders/create`, `/api/affiliate-links/create`
- ✅ Brand/Company 専用ルート: `/brand/dashboard`, `/brand/products`, `/api/brand/products`
- ✅ Admin 専用ルート: `/admin/*`, `/api/admin/*`
- ✅ 公開ルート: `/`, `/arena/[slug]`, `/api/rankings`, `/api/arena/tournaments/*`

### 4. 環境変数

- ✅ 公開環境変数: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ サーバー環境変数: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- ✅ 環境変数のバリデーション: `src/lib/env.ts` で一元管理

---

## 既知の制約（MVP）

### 1. 認証不要の API Routes

- `/api/checkout/create`: 公開API（Stripe Checkout は公開で問題ない）
- `/api/rankings`: 未認証でもアクセス可能（ランキングは公開情報）
- `/api/arena/tournaments/*`: 未認証でもアクセス可能（トーナメント情報は公開）

### 2. RLS の制約

- `fraud_flags` テーブル: 現在は Admin のみ閲覧可能（Creator は直接取得できない可能性がある）
- 将来的には RLS ポリシーを追加して Creator も自分の `fraud_flags` を閲覧可能にする予定

### 3. モックデータ

- LP (`/`) の Hero セクション: `src/lib/arena/landing-mock.ts` を使用
- 将来的には実データ（`tournaments` テーブル + `leaderboard` API）から取得するように変更予定

---

## 修正した問題

### 1. `/api/rankings` の null チェック

**問題**: `user.id` を使用していたが、`user` が null の場合がある

**修正**: `userId` を使用するように変更（115行目）

```typescript
// 修正前
const myRankIndex = rankings.findIndex(
  (r) => r.creatorId === user.id
);

// 修正後
const myRank = userId
  ? (() => {
      const myRankIndex = rankings.findIndex(
        (r) => r.creatorId === userId
      );
      return myRankIndex >= 0 ? myRankIndex + 1 : null;
    })()
  : null;
```

---

## 次のステップ

1. **RLS ポリシーの追加**: Creator が自分の `fraud_flags` を閲覧可能にする
2. **LP の実データ化**: `getLandingArenaHighlight()` を実データから取得するように変更
3. **リアルタイム更新**: WebSocket / Server-Sent Events でランキングをリアルタイム更新

