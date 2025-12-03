/**
 * Landing Page 用の Arena / Tournament モックデータ
 * 
 * Phase 8-C: Arena / Tournament プレイヤー体験 (Creator / LP 連携)
 * 
 * このファイルは、LP（Landing Page）で表示するトーナメント情報を提供します。
 * MVP ではモックデータを使用しますが、将来的には実データに差し替え可能な構造になっています。
 * 
 * 実データに差し替える場合:
 * - `getLandingArenaHighlight()` を実装し、`createServerSupabaseClient()` で
 *   現在 live のトーナメントを取得して返すように変更
 */

import type { Tournament, TournamentRankingRow } from "./types";

/**
 * Landing Page 用の Arena ハイライト情報
 */
export interface LandingArenaHighlight {
  /** 現在のトーナメント名 */
  tournamentName: string;
  /** 現在の順位（例: 7） */
  currentRank: number;
  /** 推定報酬（円） */
  estimatedReward: number;
  /** アクティブなバトル数 */
  activeBattles: number;
  /** 参加クリエイター数 */
  activeCreators: number;
  /** 24時間のGMV増加率（%） */
  gmv24hChange: number;
  /** ホットメッセージ（例: "今夜のバトルが熱い！"） */
  hotMessage: string;
  /** クリック率の増加（%） */
  clickRateChange: number;
}

/**
 * Landing Page 用の Arena ハイライト情報を取得
 * 
 * MVP ではモックデータを返します。
 * 将来的には実データ（`tournaments` テーブル + `leaderboard` API）から取得するように変更予定。
 * 
 * @returns Landing Page で表示する Arena 情報
 * 
 * @example
 * ```typescript
 * const highlight = getLandingArenaHighlight();
 * // highlight = {
 * //   tournamentName: "NIGHT TOURNAMENT",
 * //   currentRank: 7,
 * //   estimatedReward: 12400,
 * //   activeBattles: 8,
 * //   activeCreators: 120,
 * //   gmv24hChange: 32,
 * //   hotMessage: "今夜のバトルが熱い！",
 * //   clickRateChange: 25
 * // }
 * ```
 */
export function getLandingArenaHighlight(): LandingArenaHighlight {
  // TODO: 将来的には実データに差し替え
  // 1. createServerSupabaseClient() で現在 live のトーナメントを取得
  // 2. /api/arena/tournaments/[slug]/leaderboard からランキングを取得
  // 3. ダミーユーザーの順位と報酬を計算
  // 4. 実データを返す
  
  // MVP ではモックデータを返す
  return {
    tournamentName: "NIGHT TOURNAMENT",
    currentRank: 7,
    estimatedReward: 12400,
    activeBattles: 8,
    activeCreators: 120,
    gmv24hChange: 32,
    hotMessage: "今夜のバトルが熱い！",
    clickRateChange: 25,
  };
}

/**
 * Landing Page 用のトーナメント情報を取得（実データ版の将来実装用）
 * 
 * この関数は将来実装予定です。現在は使用されていません。
 * 
 * @param tournament - トーナメント情報（実データ）
 * @param myRanking - 自分のランキング情報（実データ）
 * @returns Landing Page で表示する Arena 情報
 */
export async function getLandingArenaHighlightFromRealData(
  tournament: Tournament | null,
  myRanking: TournamentRankingRow | null
): Promise<LandingArenaHighlight> {
  // 将来実装: 実データから情報を構築
  if (!tournament || !myRanking) {
    // フォールバック: モックデータを返す
    return getLandingArenaHighlight();
  }

  // 実データから情報を構築（将来実装）
  return {
    tournamentName: tournament.title,
    currentRank: myRanking.rank,
    estimatedReward: 0, // TODO: revenue-share.ts で計算
    activeBattles: 1, // TODO: live トーナメント数を集計
    activeCreators: 0, // TODO: 参加者数を集計
    gmv24hChange: 0, // TODO: 24時間前との比較
    hotMessage: "バトルに参加中！",
    clickRateChange: 0, // TODO: クリック率の計算
  };
}

