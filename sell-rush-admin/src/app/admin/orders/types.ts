/**
 * 注文ステータスの型定義
 */
export type OrderStatus = "completed" | "pending" | "cancelled" | null;

/**
 * 注文データの型定義
 */
export type Order = {
  id: string;
  created_at: string;
  amount: number | null;
  status: OrderStatus;
  creator_id?: string | null;
  product_id?: string | null;
  brand_id?: string | null;
};

/**
 * Creator 統計情報
 */
export type CreatorStats = {
  creatorId: string;
  orders: number;
  gmv: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  lastOrderAt: string | null;
};

/**
 * Product 統計情報
 */
export type ProductStats = {
  productId: string;
  orders: number;
  gmv: number;
  completedOrders: number;
  cancelledOrders: number;
  lastOrderAt: string | null;
};

