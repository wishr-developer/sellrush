"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Trophy, ArrowLeft, Medal, Award, Users, TrendingUp } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import type { Tournament, TournamentRankingRow, TournamentLeaderboardResponse } from "@/lib/arena/types";

/**
 * Tournament Leaderboard Client Component
 * 
 * トーナメント専用のランキングページ（プレイヤー向け）
 * 
 * 機能:
 * - トーナメントランキングの表示（上位10件）
 * - 自分の順位のハイライト
 * - トーナメント情報の表示
 * 
 * 認証:
 * - ログイン不要で閲覧可能（パブリックビュー）
 * - ログイン済みの場合は自分の順位も表示
 */
export default function TournamentLeaderboardClient() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [rankings, setRankings] = useState<TournamentRankingRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /**
   * 認証状態を確認（ログイン済みの場合は自分の順位を表示）
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
      } catch {
        // 認証エラーは無視（未認証でも閲覧可能）
        setCurrentUserId(null);
      }
    };
    checkAuth();
  }, []);

  /**
   * トーナメント情報とランキングを取得
   */
  const fetchLeaderboard = useCallback(async () => {
    if (!slug) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. トーナメント詳細を取得
      const tournamentResponse = await fetch(`/api/arena/tournaments/${slug}`);
      if (!tournamentResponse.ok) {
        throw new Error("トーナメントの取得に失敗しました");
      }
      const tournamentData = await tournamentResponse.json();
      setTournament(tournamentData.tournament as Tournament);

      // 2. ランキングを取得
      const leaderboardResponse = await fetch(
        `/api/arena/tournaments/${slug}/leaderboard?limit=20`
      );
      if (!leaderboardResponse.ok) {
        throw new Error("ランキングの取得に失敗しました");
      }
      const leaderboardData = await leaderboardResponse.json() as TournamentLeaderboardResponse;
      setRankings(leaderboardData.rankings || []);
      setMyRank(leaderboardData.myRank || null);
    } catch (err: any) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Tournament leaderboard fetch error:", err);
      }
      setError(err.message || "ランキングの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  /**
   * 順位アイコンの取得
   */
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-zinc-400 text-sm font-bold">
            {rank}
          </span>
        );
    }
  };

  /**
   * 順位のスタイル取得
   */
  const getRankStyle = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return "bg-blue-500/20 border-blue-500/50";
    }

    switch (rank) {
      case 1:
        return "bg-yellow-500/10 border-yellow-500/30";
      case 2:
        return "bg-gray-400/10 border-gray-400/30";
      case 3:
        return "bg-amber-600/10 border-amber-600/30";
      default:
        return "bg-zinc-900/50 border-white/10";
    }
  };

  /**
   * ユーザーIDの短縮表示
   */
  const shortenUserId = (userId: string) => {
    if (userId.includes("@")) {
      // メールアドレスの場合
      const [local, domain] = userId.split("@");
      return `${local.substring(0, 4)}...@${domain.substring(0, 4)}...`;
    }
    // UIDの場合
    return `${userId.substring(0, 8)}...`;
  };

  /**
   * ステータスの表示用ラベル
   */
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled":
        return "予定";
      case "live":
        return "開催中";
      case "finished":
        return "終了";
      default:
        return status;
    }
  };

  /**
   * ステータスの表示用色
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "live":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      case "finished":
        return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
      default:
        return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
    }
  };

  /**
   * 日付のフォーマット
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-slate-300">読み込み中...</p>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-zinc-400 mb-2">
            {error || "トーナメントが見つかりません"}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            トップに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ヘッダー */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              トップに戻る
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                {tournament.title}
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                {tournament.description || "販売バトル / トーナメント"}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded text-sm font-medium border ${getStatusColor(
              tournament.status
            )}`}
          >
            {getStatusLabel(tournament.status)}
          </span>
        </header>

        {/* トーナメント情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <DashboardCard
            title="期間"
            icon={<TrendingUp className="w-4 h-4 text-sky-400" />}
          >
            <div className="space-y-1">
              <p className="text-sm text-white">
                開始: {formatDate(tournament.startAt)}
              </p>
              <p className="text-sm text-white">
                終了: {formatDate(tournament.endAt)}
              </p>
            </div>
          </DashboardCard>

          <DashboardCard
            title="参加者数"
            icon={<Users className="w-4 h-4 text-blue-400" />}
          >
            <p className="text-2xl font-bold text-white">{rankings.length}</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              現在の参加者数
            </p>
          </DashboardCard>

          <DashboardCard
            title="総売上"
            icon={<Trophy className="w-4 h-4 text-emerald-400" />}
          >
            <p className="text-2xl font-bold text-emerald-400">
              ¥{rankings.reduce((sum, r) => sum + r.totalRevenue, 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              トーナメント全体の売上
            </p>
          </DashboardCard>
        </div>

        {/* ランキング */}
        <DashboardCard
          title="ランキング"
          icon={<Trophy className="w-4 h-4 text-amber-400" />}
          isLoading={isLoading}
          error={error}
          onRetry={fetchLeaderboard}
        >
          {rankings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-400 mb-2">
                まだ誰もスコアを出していません
              </p>
              <p className="text-[11px] text-zinc-500">
                最初の参加者になりましょう
              </p>
            </div>
          ) : (
            <>
              {/* ランキングヘッダー（説明） */}
              <div className="mb-4 pb-3 border-b border-white/10">
                <p className="text-xs text-zinc-400 mb-1">
                  このトーナメントは、期間中の売上金額でランキングを競います。
                </p>
                <p className="text-[11px] text-zinc-500">
                  上位のクリエイターには、トーナメント終了後に報酬が分配されます。
                </p>
              </div>
              <div className="space-y-2">
                {rankings.map((ranking) => {
                const isCurrentUser =
                  currentUserId && ranking.influencerId === currentUserId;
                const rankStyle = getRankStyle(ranking.rank, !!isCurrentUser);
                const isTopThree = ranking.rank <= 3;

                return (
                  <div
                    key={ranking.influencerId}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${rankStyle} ${
                      isTopThree ? "shadow-lg" : ""
                    }`}
                  >
                    {/* 順位アイコン */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {getRankIcon(ranking.rank)}
                      {isTopThree && (
                        <span className="text-xs font-bold text-zinc-400">
                          位
                        </span>
                      )}
                    </div>

                    {/* ユーザー情報 */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          isCurrentUser
                            ? "text-blue-400"
                            : isTopThree
                            ? "text-white font-semibold"
                            : "text-white"
                        }`}
                      >
                        {ranking.influencerName ||
                          shortenUserId(ranking.influencerId)}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-blue-400">
                            (あなた)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {ranking.totalOrders} 件の注文
                      </p>
                    </div>

                    {/* 売上 */}
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-400">
                        ¥{ranking.totalRevenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">総売上</p>
                    </div>
                  </div>
                );
              })}
              </div>
            </>
          )}

          {/* 自分の順位がランキング外の場合 */}
          {myRank !== null && myRank > rankings.length && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-blue-500/20 border-blue-500/50">
                <div className="flex-shrink-0">
                  <span className="w-6 h-6 flex items-center justify-center text-blue-400 text-sm font-bold">
                    #{myRank}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-400">
                    あなたの順位: #{myRank}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    上位{rankings.length}位には表示されていませんが、順位は記録されています
                  </p>
                </div>
              </div>
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}

