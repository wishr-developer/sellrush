/**
 * ダッシュボードの計算ロジックを集約したユーティリティ関数
 * 
 * 各カードのデータソースと計算ロジックを明確にし、
 * テスト可能な形で実装する
 */

import type { OrderRow, SalesStats, PayoutStats, BattleStatus, DailyPoint } from "@/types/dashboard";

/**
 * 今日の売上と注文件数を計算
 * 
 * データソース: orders (OrderRow[])
 * 計算ロジック:
 * - 今日の日付でフィルタ
 * - GMV: 今日の注文の amount を合計
 * - Count: 今日の注文の件数
 */
export function calculateTodayStats(orders: OrderRow[]): { gmv: number; count: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayOrders = orders.filter((order) => {
    if (!order.created_at) return false;
    const created = new Date(order.created_at);
    return created >= today && created < tomorrow;
  });

  const todayGmv = todayOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const todayCount = todayOrders.length;

  return { gmv: todayGmv, count: todayCount };
}

/**
 * 日別集計データ（直近30日）を計算
 * 
 * データソース: orders (OrderRow[])
 * 計算ロジック:
 * - 過去30日分の日付を初期化
 * - 各注文を日付ごとに集計
 * - GMV と注文件数を日別に計算
 */
export function calculateDailyData(orders: OrderRow[]): DailyPoint[] {
  if (orders.length === 0) return [];

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  const dailyMap = new Map<string, { gmv: number; orders: number }>();

  // 過去30日分の日付を初期化
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo);
    date.setDate(date.getDate() + i);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    dailyMap.set(dayKey, { gmv: 0, orders: 0 });
  }

  // 注文データを日別に集計
  orders.forEach((order) => {
    if (!order.created_at) return;
    const created = new Date(order.created_at);
    if (created < thirtyDaysAgo) return;

    const dayKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")}`;

    const current = dailyMap.get(dayKey) || { gmv: 0, orders: 0 };
    dailyMap.set(dayKey, {
      gmv: current.gmv + (order.amount || 0),
      orders: current.orders + 1,
    });
  });

  // 配列に変換してソート
  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      gmv: data.gmv,
      orders: data.orders,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * 平均注文単価を計算
 * 
 * データソース: salesStats (SalesStats)
 * 計算ロジック:
 * - totalSales > 0 の場合: totalRevenue / totalSales
 * - それ以外: 0
 */
export function calculateAverageOrderValue(salesStats: SalesStats): number {
  if (salesStats.totalSales > 0) {
    return Math.floor(salesStats.totalRevenue / salesStats.totalSales);
  }
  return 0;
}

/**
 * バトル内での順位を取得
 * 
 * データソース: battles (BattleStatus[])
 * 計算ロジック:
 * - battles[0] が存在し、rank > 0 の場合: battles[0].rank
 * - それ以外: null
 */
export function getBattleRank(battles: BattleStatus[]): number | null {
  if (battles.length > 0 && battles[0].rank > 0) {
    return battles[0].rank;
  }
  return null;
}

/**
 * 報酬見込みの説明文を生成
 * 
 * データソース: salesStats (SalesStats)
 * 計算ロジック:
 * - 商品ごとの creator_share_rate で計算された報酬
 * - デフォルトは「累計売上の30%相当」と表示
 */
export function getEstimatedCommissionDescription(salesStats: SalesStats): string {
  if (salesStats.totalRevenue > 0) {
    const rate = Math.floor((salesStats.estimatedCommission / salesStats.totalRevenue) * 100);
    return `累計売上の${rate}%相当`;
  }
  return "累計売上の30%相当";
}

