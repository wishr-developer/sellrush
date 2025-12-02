/**
 * ダッシュボード用のモックデータ生成関数
 * 
 * 実データがない場合でも破綻しないように、モックデータを提供します。
 * 環境変数 NEXT_PUBLIC_USE_MOCK_DATA=true で有効化できます。
 */

import type {
  SalesStats,
  PayoutStats,
  OrderRow,
  BattleStatus,
  DailyPoint,
} from "@/types/dashboard";

/**
 * モックデータを使用するかどうか
 * クライアントコンポーネントで使用するため、実行時に評価
 */
export function shouldUseMockData(): boolean {
  if (typeof window === "undefined") {
    // サーバー側では環境変数を直接参照
    return process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
  }
  // クライアント側では window から取得（必要に応じて）
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
}

/**
 * モック売上データを生成
 */
export function getMockSalesStats(): SalesStats {
  return {
    totalSales: 42,
    totalRevenue: 1250000,
    estimatedCommission: 375000, // 30%相当
  };
}

/**
 * モック注文データを生成（直近20件）
 */
export function getMockOrders(): OrderRow[] {
  const now = Date.now();
  const orders: OrderRow[] = [];

  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const amount = Math.floor(Math.random() * 50000) + 10000; // 10,000円〜60,000円

    orders.push({
      id: `mock-order-${i}`,
      amount,
      created_at: createdAt,
      status: "completed",
      product_id: `mock-product-${Math.floor(Math.random() * 5)}`,
      affiliate_link_id: `mock-link-${Math.floor(Math.random() * 3)}`,
    });
  }

  return orders.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * モック報酬データを生成
 */
export function getMockPayoutStats(): PayoutStats {
  return {
    totalPending: 150000,
    totalPaid: 225000,
    pendingCount: 3,
    paidCount: 5,
  };
}

/**
 * モックバトルデータを生成
 */
export function getMockBattles(): BattleStatus[] {
  return [
    {
      id: "mock-battle-1",
      category: "ファッション",
      title: "2024年冬コレクション",
      rank: 3,
      participants: 12,
      gmv: 2500000,
    },
  ];
}

/**
 * モック日別データを生成（直近30日）
 */
export function getMockDailyData(): DailyPoint[] {
  const now = Date.now();
  const dailyData: DailyPoint[] = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    
    // ランダムな売上を生成（週末は少し多め）
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseGmv = Math.floor(Math.random() * 50000) + 10000;
    const gmv = isWeekend ? baseGmv * 1.5 : baseGmv;
    const orders = Math.floor(Math.random() * 5) + 1;

    dailyData.push({
      date: dayKey,
      gmv: Math.floor(gmv),
      orders,
    });
  }

  return dailyData;
}

/**
 * 実データがあれば優先、なければモックデータを使用
 */
export function getDataWithFallback<T>(
  realData: T | null | undefined,
  mockData: T,
  useMock: boolean = false
): T {
  // 実データが存在し、空でない場合は実データを返す
  if (realData !== null && realData !== undefined) {
    if (Array.isArray(realData) && realData.length > 0) {
      return realData;
    }
    if (!Array.isArray(realData) && realData !== null) {
      return realData;
    }
  }

  // モックデータが有効な場合はモックデータを返す
  if (useMock) {
    return mockData;
  }

  // それ以外は実データ（空でも）を返す
  return realData ?? mockData;
}

