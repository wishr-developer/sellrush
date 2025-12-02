/**
 * Revenue Share 計算ロジック
 * 
 * 売上を Creator / Brand / Platform でどう分けるかのロジックを1箇所に集約
 * 
 * 計算方法:
 * - Creator 分配額: totalAmount * creatorRate（切り捨て）
 * - Platform 分配額: totalAmount * platformRate（切り捨て）
 * - Brand 分配額: totalAmount - creatorAmount - platformAmount（端数調整）
 * 
 * 注意:
 * - 端数処理は Math.floor() を使用（切り捨て）
 * - Brand への分配額は残りを全て割り当てる（端数調整のため）
 * - creatorRate + platformRate が 1 を超える場合は、Brand への分配額が負の値になる可能性がある
 */

export type RevenueShareInput = {
  /** 総額（注文金額） */
  totalAmount: number;
  /** プラットフォーム分配率（例: 0.15 = 15%） */
  platformRate: number;
  /** Creator 分配率（例: 0.25 = 25%） */
  creatorRate: number;
  /** Brand 分配率（オプション、未指定の場合は 1 - creatorRate - platformRate で計算） */
  brandRate?: number;
};

export type RevenueShareResult = {
  /** プラットフォームへの分配額 */
  platformAmount: number;
  /** Brand への分配額 */
  brandAmount: number;
  /** Creator への分配額 */
  creatorAmount: number;
  /** 総額（検証用） */
  totalAmount: number;
};

/**
 * Revenue Share を計算
 * 
 * @param input - 入力パラメータ
 * @returns 分配結果
 * 
 * @example
 * ```typescript
 * const result = calculateRevenueShare({
 *   totalAmount: 10000,
 *   platformRate: 0.15,
 *   creatorRate: 0.25,
 * });
 * // result = {
 * //   platformAmount: 1500,
 * //   creatorAmount: 2500,
 * //   brandAmount: 6000,
 * //   totalAmount: 10000,
 * // }
 * ```
 */
export function calculateRevenueShare(
  input: RevenueShareInput
): RevenueShareResult {
  const { totalAmount, platformRate, creatorRate, brandRate } = input;

  // バリデーション: 総額が正の値であることを確認
  if (totalAmount <= 0) {
    throw new Error("totalAmount must be greater than 0");
  }

  // バリデーション: 分配率が0以上1以下であることを確認
  if (platformRate < 0 || platformRate > 1) {
    throw new Error("platformRate must be between 0 and 1");
  }
  if (creatorRate < 0 || creatorRate > 1) {
    throw new Error("creatorRate must be between 0 and 1");
  }

  // Brand 分配率が指定されていない場合は計算
  const calculatedBrandRate =
    brandRate !== undefined
      ? brandRate
      : 1 - creatorRate - platformRate;

  // バリデーション: Brand 分配率が0以上1以下であることを確認
  if (calculatedBrandRate < 0 || calculatedBrandRate > 1) {
    throw new Error(
      `Invalid brandRate: ${calculatedBrandRate}. creatorRate + platformRate must be <= 1`
    );
  }

  // Creator 分配額を計算（切り捨て）
  const creatorAmount = Math.floor(totalAmount * creatorRate);

  // Platform 分配額を計算（切り捨て）
  const platformAmount = Math.floor(totalAmount * platformRate);

  // Brand 分配額を計算（端数調整のため、残りを全て割り当て）
  const brandAmount = totalAmount - creatorAmount - platformAmount;

  return {
    platformAmount,
    brandAmount,
    creatorAmount,
    totalAmount,
  };
}

/**
 * Revenue Share を計算（商品情報から）
 * 
 * products テーブルから取得した creator_share_rate と platform_take_rate を使用して計算
 * 
 * @param totalAmount - 総額（注文金額）
 * @param creatorShareRate - Creator 分配率（products.creator_share_rate）
 * @param platformTakeRate - Platform 分配率（products.platform_take_rate）
 * @returns 分配結果
 * 
 * @example
 * ```typescript
 * const result = calculateRevenueShareFromProduct(
 *   10000,
 *   0.25, // creator_share_rate
 *   0.15, // platform_take_rate
 * );
 * ```
 */
export function calculateRevenueShareFromProduct(
  totalAmount: number,
  creatorShareRate: number | null | undefined,
  platformTakeRate: number | null | undefined
): RevenueShareResult {
  // デフォルト値: Creator 25%, Platform 15%, Brand 60%
  const creatorRate = creatorShareRate ?? 0.25;
  const platformRate = platformTakeRate ?? 0.15;

  return calculateRevenueShare({
    totalAmount,
    platformRate,
    creatorRate,
  });
}

