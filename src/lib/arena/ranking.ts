/**
 * Arena / Tournament ランキング計算ロジック
 * 
 * Phase 8-A: Arena / Tournament MVP 実装
 * 
 * 既存の dashboard-calculations.ts のパターンに合わせた実装
 * 
 * MVP で実装した範囲:
 * - 売上金額（totalRevenue）のみでランキング
 * - 1トーナメント = 1商品
 * - 期間（start_at 〜 end_at）と商品（product_id）でフィルタ
 * 
 * 将来の拡張予定:
 * - クリック数・CVR などの指標を追加
 * - 複数商品のトーナメント対応
 * - インフルエンサー名の表示（profiles テーブルから取得）
 */

import type { OrderRow } from '@/types/dashboard';
import type { Tournament, TournamentRankingRow } from './types';

/**
 * トーナメント期間中の注文をフィルタ
 * 
 * @param orders - 注文データ
 * @param tournament - トーナメント情報
 * @returns トーナメント期間中の注文
 */
function filterTournamentOrders(
  orders: OrderRow[],
  tournament: Tournament
): OrderRow[] {
  const startAt = new Date(tournament.startAt);
  const endAt = new Date(tournament.endAt);

  return orders.filter((order) => {
    if (!order.created_at) return false;
    if (tournament.productId && order.product_id !== tournament.productId) {
      return false;
    }

    const createdAt = new Date(order.created_at);
    return createdAt >= startAt && createdAt <= endAt;
  });
}

/**
 * トーナメントランキングを構築
 * 
 * データソース: orders (OrderRow[])
 * 計算ロジック:
 * - トーナメント期間（start_at 〜 end_at）でフィルタ
 * - 対象商品（product_id）でフィルタ
 * - Creator ごとに売上を集計
 * - 売上金額（totalRevenue）降順でランキング
 * 
 * @param orders - 注文データ（全期間の注文を渡す想定）
 * @param tournament - トーナメント情報
 * @returns ランキング行の配列
 * 
 * @example
 * ```typescript
 * const rankings = buildTournamentRankingFromOrders(orders, tournament);
 * // rankings = [
 * //   { tournamentId: "...", influencerId: "user1", totalOrders: 10, totalRevenue: 100000, rank: 1 },
 * //   { tournamentId: "...", influencerId: "user2", totalOrders: 5, totalRevenue: 50000, rank: 2 },
 * //   ...
 * // ]
 * ```
 */
export function buildTournamentRankingFromOrders(
  orders: OrderRow[],
  tournament: Tournament
): TournamentRankingRow[] {
  // 1. トーナメント期間中の注文をフィルタ
  const tournamentOrders = filterTournamentOrders(orders, tournament);

  if (tournamentOrders.length === 0) {
    return [];
  }

  // 2. Creator ごとに売上を集計
  const creatorStats = new Map<
    string,
    { totalOrders: number; totalRevenue: number }
  >();

  tournamentOrders.forEach((order) => {
    if (!order.creator_id) return;

    const current = creatorStats.get(order.creator_id) || {
      totalOrders: 0,
      totalRevenue: 0,
    };

    current.totalOrders += 1;
    current.totalRevenue += order.amount || 0;
    creatorStats.set(order.creator_id, current);
  });

  // 3. ランキングに変換（売上金額降順）
  const rankings: TournamentRankingRow[] = Array.from(creatorStats.entries())
    .map(([influencerId, stats]) => ({
      tournamentId: tournament.id,
      influencerId,
      influencerName: undefined, // 将来実装（profiles テーブルから取得）
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue,
      totalClicks: undefined, // 将来実装（affiliate_links テーブルから集計）
      rank: 0, // 後で設定
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue) // 売上金額降順
    .map((item, index) => ({
      ...item,
      rank: index + 1, // 1から開始
    }));

  return rankings;
}

/**
 * ユーザーのトーナメント内順位を取得
 * 
 * @param rankings - ランキング行の配列
 * @param userId - ユーザーID
 * @returns 順位（見つからない場合は null）
 */
export function getUserRankInTournament(
  rankings: TournamentRankingRow[],
  userId: string
): number | null {
  const userRanking = rankings.find((r) => r.influencerId === userId);
  return userRanking ? userRanking.rank : null;
}

