# Phase 4: Creator Dashboard UX Polish - 実装計画

最終更新: 2025-12-02

## 1. 現状の要約

### 1.1 ページ構成

```
/dashboard
├── page.tsx                    # Server Component (Metadata設定)
├── DashboardPageClient.tsx      # LanguageProviderラッパー
├── DashboardClient.tsx         # メインコンポーネント (1443行)
└── orders/
    └── page.tsx                # 注文一覧ページ
```

### 1.2 データ取得フロー

| 関数名 | データソース | 取得タイミング | エラーハンドリング |
|--------|------------|--------------|------------------|
| `fetchSalesData()` | `affiliate_links` → `orders` → `products` | 初期化時、リアルタイム更新時 | try-catch + `showErrorToast` |
| `fetchPayoutStats()` | `payouts` | 初期化時 | try-catch + `showErrorToast` |
| `fetchBattleStatus()` | `battle_participants` → `battles` → `orders` | 初期化時、リアルタイム更新時 | try-catch（エラー時は空配列） |
| `fetchRanking()` | `/api/rankings` | `fetchBattleStatus()` 内で呼び出し | try-catch（エラー時は `null`） |
| `fetchProducts()` | `products` | 初期化時 | try-catch（エラー時はログのみ） |

### 1.3 ローディング/エラーハンドリングの現状

**全体ローディング:**
- ✅ `isLoading` で `DashboardSkeleton` を表示
- ✅ 初期化完了後に `isLoading = false`

**個別データ取得:**
- ⚠️ 各関数で個別に try-catch
- ⚠️ エラー時は `showErrorToast` で通知（一部はログのみ）
- ⚠️ エラー時も初期値（0や空配列）を設定して続行
- ⚠️ 個別のローディング状態がない（全体ローディングのみ）

**問題点:**
1. データ取得の失敗がユーザーに分かりにくい（トーストのみ）
2. 個別のローディング状態がないため、部分的な更新が分からない
3. エラー時のリトライ機能がない
4. モックデータと実データの切り替えロジックがない

### 1.4 各カードのデータソースと計算ロジック

| カード名 | データソース | 計算ロジック | モックデータ対応 |
|---------|------------|------------|----------------|
| **今夜のバトル** | `battles[0]` | `battles` 配列の最初の要素 | ❌ なし |
| **今日の売上** | `todayStats` | `orders` から今日の日付でフィルタ → `amount` を合計 | ❌ なし |
| **報酬見込み** | `salesStats.estimatedCommission` | `orders` から商品ごとの `creator_share_rate` で計算 | ❌ なし |
| **確定済み報酬** | `payoutStats.totalPaid` | `payouts` から `status = 'paid'` をフィルタ → `creator_amount` を合計 | ❌ なし |
| **支払い待ち** | `payoutStats.totalPending` | `payouts` から `status = 'pending'` をフィルタ → `creator_amount` を合計 | ❌ なし |
| **現在のポジション** | `battles[0].rank` または `myRank` | バトル内順位または全体ランキング | ❌ なし |
| **累計販売件数** | `salesStats.totalSales` | `orders` の件数 | ❌ なし |
| **累計売上** | `salesStats.totalRevenue` | `orders` の `amount` を合計 | ❌ なし |
| **平均注文単価** | `salesStats.totalRevenue / salesStats.totalSales` | 計算値 | ❌ なし |

## 2. 改善案

### 2.1 目標

1. **一貫したローディング表示**: すべての API 呼び出しに対して、個別のローディング状態を管理
2. **明確なエラー表示**: エラー時にユーザーが分かりやすい表示とリトライ機能
3. **データソースの明文化**: 各カードのデータソースと計算ロジックを明確に
4. **モックデータ対応**: 実データがない場合でも破綻しない、モックデータでも動作する

### 2.2 実装方針

#### 2.2.1 ローディング状態の統一

```typescript
// 個別のローディング状態を管理
type LoadingState = {
  sales: boolean;
  payouts: boolean;
  battles: boolean;
  ranking: boolean;
  products: boolean;
};

// 各カードにローディング表示を追加
// - スケルトンローディング
// - または小さなスピナー
```

#### 2.2.2 エラーハンドリングの統一

```typescript
// 個別のエラー状態を管理
type ErrorState = {
  sales: string | null;
  payouts: string | null;
  battles: string | null;
  ranking: string | null;
  products: string | null;
};

// エラー表示コンポーネント
// - カード内にエラーメッセージを表示
// - リトライボタンを追加
```

#### 2.2.3 データソースの明文化

各カードにコメントでデータソースを明記:
```typescript
/**
 * 今夜のバトルカード
 * データソース: battles[0] (fetchBattleStatus で取得)
 * 計算ロジック: battles 配列の最初の要素を表示
 * フォールバック: battles.length === 0 の場合、「参加中なし」を表示
 */
```

#### 2.2.4 モックデータ対応

```typescript
// 環境変数でモックデータを有効化
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

// 実データがあれば優先、なければモックデータを使用
const getSalesData = async () => {
  try {
    const realData = await fetchSalesData();
    if (realData && realData.length > 0) {
      return realData;
    }
  } catch (error) {
    // エラー時はモックデータにフォールバック
  }
  
  if (USE_MOCK_DATA) {
    return getMockSalesData();
  }
  
  return [];
};
```

### 2.3 実装ステップ

#### Step 1: ローディング/エラー状態管理の追加
- `LoadingState` と `ErrorState` の型定義
- 各データ取得関数でローディング/エラー状態を更新
- カードコンポーネントにローディング/エラー表示を追加

#### Step 2: データソースの明文化
- 各カードにコメントでデータソースを明記
- 計算ロジックを関数として抽出（テスト可能にする）

#### Step 3: モックデータ対応
- モックデータ生成関数の作成
- 実データ優先、モックデータフォールバックの実装

#### Step 4: UI改善
- カードごとのスケルトンローディング
- エラー時のリトライボタン
- 空状態の改善

## 3. 実装計画

### Phase 4.1: ローディング/エラー状態管理の追加

**変更ファイル:**
- `src/app/dashboard/DashboardClient.tsx`

**変更内容:**
1. `LoadingState` と `ErrorState` の型定義を追加
2. 各データ取得関数でローディング/エラー状態を更新
3. カードコンポーネントにローディング/エラー表示を追加

**UI変更:**
- 各カードに小さなスケルトンローディングを追加
- エラー時はカード内にエラーメッセージとリトライボタンを表示

### Phase 4.2: データソースの明文化

**変更ファイル:**
- `src/app/dashboard/DashboardClient.tsx`
- `src/types/dashboard.ts` (必要に応じて)

**変更内容:**
1. 各カードのデータソースをコメントで明記
2. 計算ロジックを関数として抽出
3. データフローのドキュメント化

### Phase 4.3: モックデータ対応

**変更ファイル:**
- `src/app/dashboard/DashboardClient.tsx`
- `src/lib/mock-data.ts` (新規作成)

**変更内容:**
1. モックデータ生成関数の作成
2. 実データ優先、モックデータフォールバックの実装
3. 環境変数でモックデータを有効化

### Phase 4.4: UI改善

**変更ファイル:**
- `src/app/dashboard/DashboardClient.tsx`
- `src/components/ui/LoadingSkeleton.tsx` (拡張)

**変更内容:**
1. カードごとのスケルトンローディングコンポーネント
2. エラー時のリトライボタン
3. 空状態の改善

## 4. 実装の優先順位

1. **Phase 4.1** (最優先): ローディング/エラー状態管理の追加
2. **Phase 4.2**: データソースの明文化
3. **Phase 4.3**: モックデータ対応
4. **Phase 4.4**: UI改善

## 5. 期待される効果

1. **UX向上**: ユーザーがデータの読み込み状態を把握できる
2. **エラー対応**: エラー時にリトライできる
3. **保守性向上**: データソースが明確になり、デバッグが容易になる
4. **開発効率**: モックデータで開発・テストが容易になる

