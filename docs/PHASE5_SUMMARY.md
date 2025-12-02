# Phase 5: Brand / D2C フローの MVP - 完了報告

最終更新: 2025-12-02

## 実装完了内容

### P5-1: ルーティング & 画面棚卸し ✅

**既存ルート:**
- `/brand` - ブランドダッシュボード（旧実装）
- `/brand/dashboard` - ブランドダッシュボード（新実装）
- `/brand/products` - 商品管理ページ
- `/brand/layout` - ブランド用レイアウト

**MVP対象ルート:**
- ✅ `/brand/dashboard` - 改善完了
- ✅ `/brand/products` - 改善完了
- ⏳ `/brand/orders` - Phase 6以降で実装予定

### P5-2: ブランド用レイアウト & ナビゲーション ✅

**実装内容:**
1. **BrandNavigation コンポーネント作成**
   - `src/components/layout/BrandNavigation.tsx` を作成
   - デスクトップ用サイドバーとモバイル用ヘッダーを実装
   - アクティブルートのハイライト表示
   - ログアウト機能

2. **メニュー項目:**
   - Dashboard (`/brand/dashboard`)
   - Products (`/brand/products`)
   - Orders (`/brand/orders`) - 将来拡張用（リンクのみ）

3. **クリエイターダッシュボードとの共通化:**
   - ログアウトボタン
   - ユーザー情報表示
   - レスポンシブ対応

4. **違い:**
   - メニュー項目が異なる（Brand用メニュー）
   - ロゴ/ブランディング（将来拡張用）

### P5-3: Product 管理フローの MVP ✅

**実装内容:**
1. **API Route作成**
   - `src/app/api/brand/products/route.ts` を作成
   - POST: 商品作成（バリデーション付き）
   - GET: 商品一覧取得（owner_id フィルタ）
   - ロールチェック: `brand` または `company` のみ
   - 統一エラーハンドリング（`api-error.ts` 使用）

2. **バリデーション強化**
   - 商品名: 1-100文字
   - 価格: 1-10,000,000円、整数
   - 在庫数: 0以上、整数
   - ステータス: `active` または `inactive`
   - 分配率: 0-1、合計 <= 1
   - URL形式チェック（画像URL）

3. **フォームフィールド対応表**

| テーブルカラム | フォームフィールド | 型 | 必須 | バリデーション |
|--------------|-----------------|----|----|------------|
| `name` | 商品名 | text | ✅ | 1-100文字 |
| `price` | 価格 | integer | ✅ | 1以上、整数 |
| `stock` | 在庫数 | integer | ❌ | 0以上、整数 |
| `status` | ステータス | enum | ✅ | 'active' \| 'inactive' |
| `company_name` | 企業名 | text | ❌ | 最大100文字 |
| `image_url` | 画像URL | text | ❌ | URL形式 |
| `description` | 説明 | text | ❌ | 最大1000文字 |
| `creator_share_rate` | クリエイター分配率 | numeric | ❌ | 0-1、デフォルト0.25 |
| `platform_take_rate` | プラットフォーム分配率 | numeric | ❌ | 0-1、デフォルト0.15 |
| `owner_id` | - | uuid | ✅ | 自動設定（auth.uid()） |

4. **brand/products/page.tsx の改善**
   - 新規作成時に API Route を使用
   - 更新は直接Supabase（将来 `/api/brand/products/[id]` を実装予定）

### P5-4: ブランド向け売上ダッシュボード ✅

**実装内容:**
1. **計算ロジックの拡張**
   - `src/lib/dashboard-calculations.ts` にブランド向け関数を追加:
     - `calculateBrandKPIData()` - ブランドKPI計算
     - `calculateProductPerformance()` - 商品別パフォーマンス
     - `calculateCreatorPerformance()` - クリエイター別パフォーマンス

2. **DashboardCard適用**
   - 総売上カード
   - 注文件数カード
   - アクティブ Creatorカード
   - ローディング/エラー状態を統一

3. **ローディング/エラー状態管理**
   - Phase 4パターンを適用
   - `LoadingState` と `ErrorState` を使用
   - リトライ機能付き

4. **データソースの明文化**
   - 各カードにデータソースと計算ロジックをコメントで明記
   - RLS前提の明示

### P5-5: ロール & パーミッションの最低限チェック ✅

**実装内容:**
1. **API Routeでのロールチェック統一**
   - `/api/brand/products` で実装済み
   - パターン:
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

2. **RLS前提の明示**
   - コメントで「RLS前提」と明記
   - RLSで保護されているテーブル:
     - `products` - `owner_id = auth.uid()` のみアクセス可能
     - `orders` - 関連する商品の `owner_id = auth.uid()` のみアクセス可能
     - `payouts` - `brand_id = auth.uid()` のみアクセス可能

## 各カードのデータソース一覧

| カード名 | データソース | 計算ロジック | ローディング/エラー対応 |
|---------|------------|------------|---------------------|
| **総売上** | `orders` | `calculateBrandKPIData()` | ✅ DashboardCard |
| **注文件数** | `orders` | `calculateBrandKPIData()` | ✅ DashboardCard |
| **アクティブ Creator** | `orders` | `calculateBrandKPIData()` | ✅ DashboardCard |
| **商品別パフォーマンス** | `orders` + `products` | `calculateProductPerformance()` | ⏳ 将来対応 |
| **クリエイター別パフォーマンス** | `orders` | `calculateCreatorPerformance()` | ⏳ 将来対応 |

## 改善効果

1. **UX向上**
   - 統一されたナビゲーション
   - ローディング/エラー状態の可視化
   - リトライ機能

2. **保守性向上**
   - データソースが明確
   - 計算ロジックが関数として抽出
   - 統一されたエラーハンドリング

3. **セキュリティ向上**
   - ロールチェックの統一
   - RLS前提の明示
   - 適切なエラーメッセージ

## 次のステップ（Phase 6以降）

1. **商品更新API Route**
   - `/api/brand/products/[id]` エンドポイントの実装

2. **注文一覧ページ**
   - `/brand/orders` ページの実装

3. **詳細分析ページ**
   - `/brand/analytics` ページの実装

4. **報酬管理ページ**
   - `/brand/payouts` ページの実装

5. **設定ページ**
   - `/brand/settings` ページの実装

