/**
 * Fraud Detection Rules
 * 
 * 不正購入・自己購入などを検知するためのルールベースの検知ロジック
 * 
 * 現在の実装レベル（MVP）:
 * - 簡易ルールベースの検知のみ
 * - 機械学習や高度な分析は未実装
 * - 将来的には fraud_flags テーブルに統合予定
 */

/**
 * 注文データの型定義（fraud detection用）
 * 必要なフィールドのみを含む
 */
export type FraudDetectionOrder = {
  id: string;
  product_id: string;
  creator_id: string | null;
  amount: number | null;
  created_at: string;
  status: string | null;
};

export type FraudFlag = {
  order_id: string;
  creator_id: string | null;
  brand_id: string | null;
  reason: string;
  severity: "low" | "medium" | "high";
};

/**
 * 不正検知ルール1: 自己購入検知
 * 
 * 検知条件: creator_id === brand_id
 * 重要度: high
 * 
 * 説明: ブランドが自分の商品を自分の紹介リンクで購入している場合
 */
export function detectSelfPurchase(
  order: FraudDetectionOrder,
  brandId: string | null
): FraudFlag | null {
  if (order.creator_id && brandId && order.creator_id === brandId) {
    return {
      order_id: order.id,
      creator_id: order.creator_id,
      brand_id: brandId,
      reason: "Self-purchase detected (creator_id === brand_id)",
      severity: "high",
    };
  }
  return null;
}

/**
 * 不正検知ルール2: Burst Orders 検知
 * 
 * 検知条件: 同一creatorが5分以内に5件以上の注文
 * 重要度: medium
 * 
 * 説明: 短時間に大量の注文が発生している場合、不正な操作の可能性がある
 * 
 * 注意: この関数は注文データの配列を受け取り、集計を行う
 * 実際の検知は /api/fraud/detect で行う
 */
export function detectBurstOrders(
  order: FraudDetectionOrder,
  recentOrdersCount: number
): FraudFlag | null {
  if (recentOrdersCount >= 5) {
    return {
      order_id: order.id,
      creator_id: order.creator_id,
      brand_id: null,
      reason: `Burst orders detected (${recentOrdersCount} orders in 5 minutes)`,
      severity: "medium",
    };
  }
  return null;
}

/**
 * 不正検知ルール3: Amount Anomaly 検知
 * 
 * 検知条件: 注文額が平均注文額の3倍以上
 * 重要度: low
 * 
 * 説明: 異常に高い注文額の場合、テスト目的の可能性がある
 */
export function detectAmountAnomaly(
  order: FraudDetectionOrder,
  averageAmount: number
): FraudFlag | null {
  if (order.amount && averageAmount > 0) {
    const threshold = averageAmount * 3;
    if (order.amount > threshold) {
      return {
        order_id: order.id,
        creator_id: order.creator_id,
        brand_id: null,
        reason: `Amount anomaly detected (¥${order.amount.toLocaleString()} vs avg ¥${Math.floor(averageAmount).toLocaleString()})`,
        severity: "low",
      };
    }
  }
  return null;
}

/**
 * 不正検知ルール4: 低額注文検知
 * 
 * 検知条件: 注文額が100円未満
 * 重要度: low
 * 
 * 説明: テスト目的の低額注文の可能性がある
 */
export function detectLowAmountOrder(order: FraudDetectionOrder): FraudFlag | null {
  if (order.amount && order.amount < 100) {
    return {
      order_id: order.id,
      creator_id: order.creator_id,
      brand_id: null,
      reason: `Low amount order detected (¥${order.amount})`,
      severity: "low",
    };
  }
  return null;
}

/**
 * 不正検知ルール5: 同一IPからの連続注文検知（将来実装）
 * 
 * 検知条件: 同一IPから短時間に複数の注文
 * 重要度: medium
 * 
 * 注意: 現在は実装していない（IP情報がAPI Routeで取得可能な場合のみ）
 * 将来的には request.headers から IP を取得して検知
 */
export function detectSameIPOrders(
  order: FraudDetectionOrder,
  sameIPOrdersCount: number
): FraudFlag | null {
  // 将来実装: IP情報が利用可能になったら実装
  if (sameIPOrdersCount >= 3) {
    return {
      order_id: order.id,
      creator_id: order.creator_id,
      brand_id: null,
      reason: `Same IP orders detected (${sameIPOrdersCount} orders from same IP)`,
      severity: "medium",
    };
  }
  return null;
}

/**
 * すべての不正検知ルールを実行
 * 
 * @param order - 検知対象の注文
 * @param context - 検知に必要なコンテキスト情報
 * @returns 検知された不正フラグの配列
 */
export function runFraudDetectionRules(
  order: FraudDetectionOrder,
  context: {
    brandId?: string | null;
    recentOrdersCount?: number;
    averageAmount?: number;
    sameIPOrdersCount?: number;
  }
): FraudFlag[] {
  const flags: FraudFlag[] = [];

  // ルール1: 自己購入検知
  const selfPurchaseFlag = detectSelfPurchase(order, context.brandId || null);
  if (selfPurchaseFlag) {
    flags.push(selfPurchaseFlag);
  }

  // ルール2: Burst Orders 検知
  if (context.recentOrdersCount !== undefined) {
    const burstFlag = detectBurstOrders(order, context.recentOrdersCount);
    if (burstFlag) {
      flags.push(burstFlag);
    }
  }

  // ルール3: Amount Anomaly 検知
  if (context.averageAmount !== undefined) {
    const anomalyFlag = detectAmountAnomaly(order, context.averageAmount);
    if (anomalyFlag) {
      flags.push(anomalyFlag);
    }
  }

  // ルール4: 低額注文検知
  const lowAmountFlag = detectLowAmountOrder(order);
  if (lowAmountFlag) {
    flags.push(lowAmountFlag);
  }

  // ルール5: 同一IPからの連続注文検知（将来実装）
  if (context.sameIPOrdersCount !== undefined) {
    const sameIPFlag = detectSameIPOrders(order, context.sameIPOrdersCount);
    if (sameIPFlag) {
      flags.push(sameIPFlag);
    }
  }

  return flags;
}

