# Phase 5: Brand / D2C フローの MVP - 実装計画

最終更新: 2025-12-02

## P5-1: ルーティング & 画面棚卸し

### 既存のルート

| ルート | ファイル | 状態 | 説明 |
|--------|---------|------|------|
| `/brand` | `src/app/brand/page.tsx` | ✅ 存在 | ブランドダッシュボード（旧実装） |
| `/brand/dashboard` | `src/app/brand/dashboard/page.tsx` | ✅ 存在 | ブランドダッシュボード（新実装） |
| `/brand/products` | `src/app/brand/products/page.tsx` | ✅ 存在 | 商品管理ページ |
| `/brand/layout` | `src/app/brand/layout.tsx` | ✅ 存在 | ブランド用レイアウト |

### 設計上あると良いルート（未実装）

| ルート | 優先度 | 説明 |
|--------|--------|------|
| `/brand/orders` | P1 | 注文一覧ページ（ブランド視点） |
| `/brand/settings` | P2 | ブランド設定ページ |
| `/brand/analytics` | P3 | 詳細分析ページ（将来拡張用） |
| `/brand/payouts` | P2 | 報酬管理ページ |

### MVP対象ルート

**Phase 5 MVP で実装するルート:**
1. ✅ `/brand/dashboard` - 既存を改善（Phase 4のパターンを適用）
2. ✅ `/brand/products` - 既存を改善（バリデーション強化、API Route統一）
3. ⏳ `/brand/orders` - 新規作成（注文一覧）

**Phase 5 では実装しないルート:**
- `/brand/settings` - Phase 6以降
- `/brand/analytics` - Phase 6以降
- `/brand/payouts` - Phase 6以降（報酬はダッシュボードに統合）

## P5-2: ブランド用レイアウト & ナビゲーション

### 現状

- `src/app/brand/layout.tsx` が存在するが、ナビゲーションメニューがない
- クリエイターダッシュボードと共通化できる部分が多い

### 提案: 統一ナビゲーションコンポーネント

**実装方針:**
1. `src/components/layout/BrandNavigation.tsx` を作成
2. メニュー項目:
   - Dashboard (`/brand/dashboard`)
   - Products (`/brand/products`)
   - Orders (`/brand/orders`) - 新規
   - Settings (`/brand/settings`) - 将来用（非表示またはプレースホルダー）

3. クリエイターダッシュボードとの共通化:
   - ログアウトボタン
   - ユーザー情報表示
   - レスポンシブ対応

4. 違い:
   - メニュー項目が異なる（Dashboard, Products, Orders vs Dashboard, Rankings）
   - ロゴ/ブランディング（将来拡張用）

## P5-3: Product 管理フローの MVP

### 現状

- `src/app/brand/products/page.tsx` が存在
- 商品一覧、作成、編集機能がある
- バリデーションは一部実装済み
- API Routeは直接Supabase呼び出し（統一ユーティリティ未使用）

### 改善内容

#### 1. Supabase products テーブルとフォームフィールド対応表

| テーブルカラム | フォームフィールド | 型 | 必須 | バリデーション |
|--------------|-----------------|----|----|------------|
| `id` | - | uuid | ✅ | 自動生成 |
| `name` | 商品名 | text | ✅ | 1-100文字 |
| `price` | 価格 | integer | ✅ | 1以上、整数 |
| `stock` | 在庫数 | integer | ❌ | 0以上、整数 |
| `status` | ステータス | enum | ✅ | 'active' | 'inactive' |
| `company_name` | 企業名 | text | ❌ | 最大100文字 |
| `image_url` | 画像URL | text | ❌ | URL形式 |
| `description` | 説明 | text | ❌ | 最大1000文字 |
| `creator_share_rate` | クリエイター分配率 | numeric | ❌ | 0-1、デフォルト0.25 |
| `platform_take_rate` | プラットフォーム分配率 | numeric | ❌ | 0-1、デフォルト0.15 |
| `owner_id` | - | uuid | ✅ | 自動設定（auth.uid()） |
| `created_at` | - | timestamp | ✅ | 自動設定 |
| `updated_at` | - | timestamp | ✅ | 自動更新 |

#### 2. バリデーション強化

- Zodスキーマを使用（既存の `ProductFormSchema` を拡張）
- クライアント側とサーバー側の両方でバリデーション
- エラーメッセージを日本語で表示

#### 3. API Route統一

- `src/app/api/brand/products/route.ts` を作成
- `createApiSupabaseClient()` を使用
- `api-error.ts` の統一エラーハンドリングを使用
- ロールチェック: `brand` または `company` のみ

## P5-4: ブランド向け売上ダッシュボード

### 現状

- `src/app/brand/dashboard/BrandDashboardClient.tsx` が存在
- KPIカードが実装済み
- Phase 4の `DashboardCard` コンポーネントが未適用

### 改善内容

#### 1. 指標カード設計（3-4個）

| カード名 | データソース | 計算ロジック | 優先度 |
|---------|------------|------------|--------|
| **直近7日のGMV** | `orders` (直近7日) | `amount` を合計 | P1 |
| **直近7日の注文数** | `orders` (直近7日) | 件数をカウント | P1 |
| **商品別トップN** | `orders` + `products` | 商品ごとに集計、売上順 | P1 |
| **クリエイター別トップN** | `orders` + `affiliate_links` | クリエイターごとに集計 | P2 |

#### 2. 計算ロジックの拡張

- `src/lib/dashboard-calculations.ts` にブランド向け関数を追加:
  - `calculateBrandKPIData()` - ブランドKPI計算
  - `calculateProductPerformance()` - 商品別パフォーマンス
  - `calculateCreatorPerformance()` - クリエイター別パフォーマンス

#### 3. DashboardCard適用

- すべてのカードに `DashboardCard` を適用
- ローディング/エラー状態を統一

## P5-5: ロール & パーミッションの最低限チェック

### 現状

- 各ページで個別にロールチェックを実装
- API Routeでは一部統一されているが、完全ではない

### 改善内容

#### 1. API Routeでのロールチェック統一

**パターン:**
```typescript
// 認証チェック
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return unauthorizedError("Unauthorized");
}

// ロールチェック（Brand/Company のみ）
const userRole = user.user_metadata?.role;
if (userRole !== "brand" && userRole !== "company") {
  return forbiddenError("Brand access required");
}
```

#### 2. RLS前提の明示

- コメントで「RLS前提」と明記
- RLSで保護されているテーブル:
  - `products` - `owner_id = auth.uid()` のみアクセス可能
  - `orders` - 関連する商品の `owner_id = auth.uid()` のみアクセス可能
  - `payouts` - `brand_id = auth.uid()` のみアクセス可能

#### 3. 適用対象API Route

- `/api/brand/products` (新規作成)
- `/api/brand/products/[id]` (更新/削除) - 将来拡張用

## 実装ステップ

### Step 1: P5-1 ルーティング棚卸し ✅
- [x] 既存ルートの調査
- [x] MVP対象ルートの決定

### Step 2: P5-2 ブランド用レイアウト & ナビゲーション
- [ ] `BrandNavigation.tsx` コンポーネント作成
- [ ] `brand/layout.tsx` に統合
- [ ] レスポンシブ対応

### Step 3: P5-3 Product 管理フローの MVP
- [ ] `ProductFormSchema` の拡張（Zod）
- [ ] `/api/brand/products` API Route作成
- [ ] `brand/products/page.tsx` の改善
- [ ] バリデーション強化

### Step 4: P5-4 ブランド向け売上ダッシュボード
- [ ] `dashboard-calculations.ts` にブランド向け関数追加
- [ ] `BrandDashboardClient.tsx` に `DashboardCard` 適用
- [ ] ローディング/エラー状態管理追加
- [ ] 指標カードの実装

### Step 5: P5-5 ロール & パーミッション
- [ ] API Routeでのロールチェック統一
- [ ] RLS前提のコメント追加
- [ ] エラーハンドリング統一

## 実装の優先順位

1. **P5-2** (最優先): ブランド用レイアウト & ナビゲーション
2. **P5-3**: Product 管理フローの MVP
3. **P5-4**: ブランド向け売上ダッシュボード
4. **P5-5**: ロール & パーミッション

## 注意事項

- 既存の Phase 2-4 の設計パターンに従う
- `supabase-server.ts`, `api-error.ts`, `DashboardCard` を必ず使用
- 新規追加・変更箇所には日本語コメントを追加
- 差分が大きくなりすぎないように、小さなステップに分割

