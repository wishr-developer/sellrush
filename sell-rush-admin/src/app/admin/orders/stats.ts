import { Order, OrderStatus, CreatorStats, ProductStats } from "./types";

/**
 * Creator ごとの統計情報を集計する
 * @param orders 注文データの配列
 * @returns Creator ID をキーとした統計情報の Map
 * @remarks
 * - GMV は status === "completed" の注文のみを集計
 * - creator_id が null の注文は集計対象外
 * - lastOrderAt は全ステータスの注文から最新日時を取得
 */
export const buildCreatorStatsMap = (
  orders: Order[]
): Map<string, CreatorStats> => {
  const map = new Map<string, CreatorStats>();

  for (const order of orders) {
    const creatorId = order.creator_id;
    if (!creatorId) continue;

    const key = String(creatorId);
    let stat = map.get(key);
    if (!stat) {
      stat = {
        creatorId: key,
        orders: 0,
        gmv: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        pendingOrders: 0,
        lastOrderAt: null,
      };
      map.set(key, stat);
    }

    stat.orders += 1;
    const amount = Number(order.amount ?? 0);

    // GMV は completed ステータスのみ集計する
    const status: OrderStatus = order.status;
    if (status === "completed") {
      stat.gmv += amount;
      stat.completedOrders += 1;
    } else if (status === "cancelled") {
      stat.cancelledOrders += 1;
    } else if (status === "pending") {
      stat.pendingOrders += 1;
    }
    // status が null の場合は、どのカウントも増やさない

    const createdAt = order.created_at ? new Date(order.created_at) : null;
    if (createdAt) {
      if (!stat.lastOrderAt || createdAt > new Date(stat.lastOrderAt)) {
        stat.lastOrderAt = createdAt.toISOString();
      }
    }
  }

  return map;
};

/**
 * Product ごとの統計情報を集計する
 * @param orders 注文データの配列
 * @returns Product ID をキーとした統計情報の Map
 * @remarks
 * - GMV は status === "completed" の注文のみを集計
 * - product_id が null の注文は集計対象外
 * - lastOrderAt は全ステータスの注文から最新日時を取得
 */
export const buildProductStatsMap = (
  orders: Order[]
): Map<string, ProductStats> => {
  const map = new Map<string, ProductStats>();

  for (const order of orders) {
    const productId = order.product_id;
    if (!productId) continue;

    const key = String(productId);
    let stat = map.get(key);
    if (!stat) {
      stat = {
        productId: key,
        orders: 0,
        gmv: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        lastOrderAt: null,
      };
      map.set(key, stat);
    }

    stat.orders += 1;
    const amount = Number(order.amount ?? 0);

    // GMV は completed ステータスのみ集計する
    const status: OrderStatus = order.status;
    if (status === "completed") {
      stat.gmv += amount;
      stat.completedOrders += 1;
    } else if (status === "cancelled") {
      stat.cancelledOrders += 1;
    }
    // status が null の場合は、どのカウントも増やさない

    const createdAt = order.created_at ? new Date(order.created_at) : null;
    if (createdAt) {
      if (!stat.lastOrderAt || createdAt > new Date(stat.lastOrderAt)) {
        stat.lastOrderAt = createdAt.toISOString();
      }
    }
  }

  return map;
};

