/**
 * Arena / Tournament 関連の型定義
 * 
 * Phase 8-A: Arena / Tournament MVP 実装
 */

/**
 * トーナメントステータス
 */
export type TournamentStatus = 'scheduled' | 'live' | 'finished';

/**
 * トーナメント
 */
export interface Tournament {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  status: TournamentStatus;
  startAt: string; // ISO 8601 形式のタイムスタンプ
  endAt: string; // ISO 8601 形式のタイムスタンプ
  productId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * トーナメントランキング行
 * 
 * トーナメント × インフルエンサー × 指標の集計ビュー
 */
export interface TournamentRankingRow {
  tournamentId: string;
  influencerId: string;
  influencerName?: string; // 将来実装（現在は null または undefined）
  totalOrders: number;
  totalRevenue: number;
  totalClicks?: number; // 将来実装（現在は undefined）
  rank: number; // 1から開始
}

/**
 * トーナメント詳細（商品情報を含む）
 */
export interface TournamentWithProduct extends Tournament {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
  } | null;
}

/**
 * トーナメントランキングレスポンス
 */
export interface TournamentLeaderboardResponse {
  tournament: Tournament;
  rankings: TournamentRankingRow[];
  myRank: number | null; // 認証済みユーザーの順位（未認証の場合は null）
}

