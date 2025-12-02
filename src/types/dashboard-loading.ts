/**
 * ダッシュボードのローディング/エラー状態管理用の型定義
 */

/**
 * 各データ取得のローディング状態
 */
export type LoadingState = {
  sales: boolean;
  payouts: boolean;
  battles: boolean;
  ranking: boolean;
  products: boolean;
};

/**
 * 各データ取得のエラー状態
 */
export type ErrorState = {
  sales: string | null;
  payouts: string | null;
  battles: string | null;
  ranking: string | null;
  products: string | null;
};

/**
 * ローディング状態の初期値
 */
export const initialLoadingState: LoadingState = {
  sales: false,
  payouts: false,
  battles: false,
  ranking: false,
  products: false,
};

/**
 * エラー状態の初期値
 */
export const initialErrorState: ErrorState = {
  sales: null,
  payouts: null,
  battles: null,
  ranking: null,
  products: null,
};

