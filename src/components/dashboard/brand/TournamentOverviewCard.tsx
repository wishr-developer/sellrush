"use client";

import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Trophy, Users, TrendingUp } from "lucide-react";
import type { Tournament } from "@/lib/arena/types";

interface TournamentOverviewCardProps {
  brandId: string;
  productIds: string[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Tournament Overview Card
 * 
 * Brand Dashboard 用のトーナメント概要カードコンポーネント
 * 
 * 表示項目:
 * - 自社商品のトーナメント一覧
 * - 参加クリエイター数
 * - 本日時点の売上合計
 * - トーナメントステータス（scheduled / live / finished）
 * 
 * データソース:
 * - /api/arena/tournaments?product_id=<product_id> から取得
 * - または API 内部で brand の company_id から product を紐づけてフィルタ
 * 
 * Phase 4 のパターンを踏襲:
 * - loading / error ステートを持つ
 * - エラー時は再読み込みボタン or 軽いメッセージ
 */
export function TournamentOverviewCard({
  brandId,
  productIds,
  isLoading: externalLoading,
  error: externalError,
  onRetry,
}: TournamentOverviewCardProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      if (productIds.length === 0) {
        setTournaments([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 自社商品のトーナメントを取得（複数商品に対応）
        const tournamentPromises = productIds.map((productId) =>
          fetch(`/api/arena/tournaments?product_id=${productId}`)
            .then((res) => res.json())
            .then((data) => data.tournaments || [])
        );

        const tournamentArrays = await Promise.all(tournamentPromises);
        const allTournaments = tournamentArrays.flat();

        // 重複を除去（同じトーナメントが複数商品に紐づく場合があるが、MVPでは1商品=1トーナメント）
        const uniqueTournaments = Array.from(
          new Map(allTournaments.map((t: Tournament) => [t.id, t])).values()
        );

        // 開始時刻降順でソート
        uniqueTournaments.sort(
          (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
        );

        setTournaments(uniqueTournaments);
      } catch (err: any) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("Tournament overview fetch error:", err);
        }
        setError(err.message || "トーナメント情報の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournaments();
  }, [productIds]);

  // 外部から渡された loading / error を優先
  const displayLoading = externalLoading !== undefined ? externalLoading : isLoading;
  const displayError = externalError !== undefined ? externalError : error;

  // 開催中のトーナメントを取得
  const liveTournaments = tournaments.filter((t) => t.status === "live");
  const scheduledTournaments = tournaments.filter((t) => t.status === "scheduled");
  const finishedTournaments = tournaments.filter((t) => t.status === "finished");

  return (
    <DashboardCard
      title="トーナメント概要"
      icon={<Trophy className="w-4 h-4 text-amber-400" />}
      isLoading={displayLoading}
      error={displayError}
      onRetry={onRetry || (() => window.location.reload())}
    >
      {tournaments.length === 0 ? (
        <div>
          <p className="text-lg font-semibold text-zinc-400 mb-1">
            トーナメントはありません
          </p>
          <p className="text-[11px] text-zinc-500">
            商品にトーナメントを設定してください
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 開催中のトーナメント */}
          {liveTournaments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <p className="text-xs text-emerald-400 font-medium">
                  開催中 ({liveTournaments.length})
                </p>
              </div>
              {liveTournaments.slice(0, 2).map((tournament) => (
                <div
                  key={tournament.id}
                  className="mb-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                >
                  <p className="text-sm font-semibold text-white mb-1">
                    {tournament.title}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {new Date(tournament.startAt).toLocaleDateString("ja-JP")} 〜{" "}
                    {new Date(tournament.endAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 予定のトーナメント */}
          {scheduledTournaments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3 h-3 text-blue-400" />
                <p className="text-xs text-blue-400 font-medium">
                  予定 ({scheduledTournaments.length})
                </p>
              </div>
              {scheduledTournaments.slice(0, 2).map((tournament) => (
                <div
                  key={tournament.id}
                  className="mb-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
                >
                  <p className="text-sm font-semibold text-white mb-1">
                    {tournament.title}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {new Date(tournament.startAt).toLocaleDateString("ja-JP")} 〜{" "}
                    {new Date(tournament.endAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 終了したトーナメント */}
          {finishedTournaments.length > 0 && liveTournaments.length === 0 && scheduledTournaments.length === 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-2">
                終了 ({finishedTournaments.length})
              </p>
              {finishedTournaments.slice(0, 1).map((tournament) => (
                <div
                  key={tournament.id}
                  className="p-2 rounded-lg bg-zinc-800/50 border border-white/10"
                >
                  <p className="text-sm font-semibold text-zinc-400 mb-1">
                    {tournament.title}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {new Date(tournament.startAt).toLocaleDateString("ja-JP")} 〜{" "}
                    {new Date(tournament.endAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardCard>
  );
}

