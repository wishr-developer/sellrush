"use client";

import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Trophy, Zap, TrendingUp } from "lucide-react";
import type { Tournament, TournamentRankingRow } from "@/lib/arena/types";
import { calculateRevenueShareFromProduct } from "@/lib/revenue-share";

interface CurrentTournamentCardProps {
  userId: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Current Tournament Card
 * 
 * Creator Dashboard 用のトーナメントカードコンポーネント
 * 
 * 表示項目:
 * - トーナメント名（例: "NIGHT TOURNAMENT"）
 * - 現在の順位（例: "#07 / NIGHT TOURNAMENT"）
 * - 推定報酬（Est. Reward）
 * - トーナメントステータス（scheduled / live / finished）
 * 
 * データソース:
 * - /api/arena/tournaments?status=live から「今のトーナメント」を1件取得
 * - /api/arena/tournaments/[slug]/leaderboard から自分の順位を抽出
 * 
 * Phase 4 のパターンを踏襲:
 * - loading / error ステートを持つ
 * - エラー時は再読み込みボタン or 軽いメッセージ
 */
export function CurrentTournamentCard({
  userId,
  isLoading: externalLoading,
  error: externalError,
  onRetry,
}: CurrentTournamentCardProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myRevenue, setMyRevenue] = useState<number>(0);
  const [estimatedReward, setEstimatedReward] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentTournament = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. 現在開催中のトーナメントを取得
        const tournamentsResponse = await fetch("/api/arena/tournaments?status=live");
        
        if (!tournamentsResponse.ok) {
          throw new Error("トーナメントの取得に失敗しました");
        }

        const tournamentsData = await tournamentsResponse.json();
        const liveTournaments = tournamentsData.tournaments || [];

        if (liveTournaments.length === 0) {
          // 開催中のトーナメントがない場合
          setTournament(null);
          setMyRank(null);
          setMyRevenue(0);
          setEstimatedReward(0);
          return;
        }

        // 最初のトーナメントを使用（複数ある場合は最初の1件）
        const currentTournament = liveTournaments[0] as Tournament;
        setTournament(currentTournament);

        // 2. ランキングを取得して自分の順位を抽出
        const leaderboardResponse = await fetch(
          `/api/arena/tournaments/${currentTournament.slug}/leaderboard`
        );

        if (!leaderboardResponse.ok) {
          throw new Error("ランキングの取得に失敗しました");
        }

        const leaderboardData = await leaderboardResponse.json();
        const rankings = leaderboardData.rankings || [];
        const myRankValue = leaderboardData.myRank || null;

        setMyRank(myRankValue);

        // 自分の売上を取得
        const myRanking = rankings.find(
          (r: TournamentRankingRow) => r.influencerId === userId
        );

        if (myRanking) {
          setMyRevenue(myRanking.totalRevenue);
          
          // 推定報酬を計算（商品の creator_share_rate を使用）
          // 注意: MVP では商品情報がないため、デフォルト値（25%）を使用
          // 将来的には商品情報を取得して正確な分配率を使用
          const revenueShare = calculateRevenueShareFromProduct(
            myRanking.totalRevenue,
            0.25, // デフォルト: Creator 25%
            0.15  // デフォルト: Platform 15%
          );
          setEstimatedReward(revenueShare.creatorAmount);
        } else {
          setMyRevenue(0);
          setEstimatedReward(0);
        }
      } catch (err: any) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("Current tournament fetch error:", err);
        }
        setError(err.message || "トーナメント情報の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentTournament();
  }, [userId]);

  // 外部から渡された loading / error を優先
  const displayLoading = externalLoading !== undefined ? externalLoading : isLoading;
  const displayError = externalError !== undefined ? externalError : error;

  return (
    <DashboardCard
      title="現在のトーナメント"
      icon={<Trophy className="w-4 h-4 text-amber-400" />}
      isLoading={displayLoading}
      error={displayError}
      onRetry={onRetry || (() => window.location.reload())}
    >
      {tournament ? (
        <div>
          <div className="mb-3">
            <p className="text-lg font-semibold text-white mb-1">
              {tournament.title}
            </p>
            <p className="text-[11px] text-zinc-500">
              {tournament.status === "live" ? "開催中" : 
               tournament.status === "scheduled" ? "予定" : 
               "終了"}
            </p>
          </div>

          {myRank !== null && myRank > 0 ? (
            <>
              <div className="mb-2">
                <p className="text-xl font-semibold text-amber-400 mb-1">
                  #{myRank}
                </p>
                <p className="text-[11px] text-zinc-500">
                  現在の順位
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">売上</p>
                  <p className="text-sm font-semibold text-white">
                    ¥{myRevenue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">推定報酬</p>
                  <p className="text-sm font-semibold text-emerald-400">
                    ¥{estimatedReward.toLocaleString()}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm text-zinc-400 mb-1">
                まだ参加していません
              </p>
              <p className="text-[11px] text-zinc-500">
                紹介リンクを投稿して参加しましょう
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-lg font-semibold text-zinc-400 mb-1">
            開催中のトーナメントはありません
          </p>
          <p className="text-[11px] text-zinc-500">
            次のトーナメントをお待ちください
          </p>
        </div>
      )}
    </DashboardCard>
  );
}

