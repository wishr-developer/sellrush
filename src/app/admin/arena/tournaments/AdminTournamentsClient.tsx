"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Trophy, Plus, Eye, Edit, Calendar, Package, AlertCircle } from "lucide-react";
import type { Tournament } from "@/lib/arena/types";

/**
 * Admin Tournaments Client Component
 * 
 * トーナメント一覧・管理画面
 * 
 * 機能:
 * - トーナメント一覧の表示
 * - ステータス別フィルタ（scheduled / live / finished）
 * - 各トーナメントの詳細・編集へのリンク
 * 
 * 認証:
 * - Admin ロールのみアクセス可能
 * - 認証失敗時は /login にリダイレクト
 */
export default function AdminTournamentsClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  /**
   * アクセスチェックとデータ取得
   */
  const checkAccessAndFetch = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.user_metadata?.role !== "admin") {
        router.replace("/login");
        return;
      }

      setIsAuthorized(true);
      await fetchTournaments();
    } catch (err: any) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Admin tournaments access check error:", err);
      }
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  /**
   * トーナメント一覧を取得
   * 
   * データソース: /api/arena/tournaments
   */
  const fetchTournaments = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/arena/tournaments");

      if (!response.ok) {
        throw new Error("トーナメントの取得に失敗しました");
      }

      const data = await response.json();
      setTournaments(data.tournaments || []);
    } catch (err: any) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Tournaments fetch error:", err);
      }
      setError(err.message || "トーナメントの取得に失敗しました");
    }
  }, []);

  useEffect(() => {
    void checkAccessAndFetch();
  }, [checkAccessAndFetch]);

  // ステータスフィルタを適用
  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredTournaments(tournaments);
    } else {
      setFilteredTournaments(
        tournaments.filter((t) => t.status === statusFilter)
      );
    }
  }, [tournaments, statusFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-slate-300">読み込み中...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

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

  return (
    <div className="min-h-screen bg-black text-white pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ヘッダー */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              Arena / Tournaments
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              販売バトル / トーナメントの管理
            </p>
          </div>
          <Link
            href="/admin/arena/tournaments/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </Link>
        </header>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* フィルタ */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm text-zinc-400">ステータス:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">すべて</option>
            <option value="scheduled">予定</option>
            <option value="live">開催中</option>
            <option value="finished">終了</option>
          </select>
        </div>

        {/* トーナメント一覧 */}
        {filteredTournaments.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-8 text-center">
            <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-zinc-400 mb-2">
              トーナメントがありません
            </p>
            <p className="text-sm text-zinc-500 mb-6">
              {statusFilter === "all"
                ? "新規トーナメントを作成してください"
                : `${getStatusLabel(statusFilter)}のトーナメントがありません`}
            </p>
            <Link
              href="/admin/arena/tournaments/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新規作成
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-6 hover:border-white/20 transition-colors"
              >
                {/* ヘッダー */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {tournament.title}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono">
                      {tournament.slug}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                      tournament.status
                    )}`}
                  >
                    {getStatusLabel(tournament.status)}
                  </span>
                </div>

                {/* 説明 */}
                {tournament.description && (
                  <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                    {tournament.description}
                  </p>
                )}

                {/* 期間 */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar className="w-3 h-3" />
                    <span>開始: {formatDate(tournament.startAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Calendar className="w-3 h-3" />
                    <span>終了: {formatDate(tournament.endAt)}</span>
                  </div>
                </div>

                {/* 商品情報 */}
                {tournament.productId && (
                  <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500">
                    <Package className="w-3 h-3" />
                    <span>商品ID: {tournament.productId.slice(0, 8)}...</span>
                  </div>
                )}

                {/* アクション */}
                <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                  <Link
                    href={`/admin/arena/tournaments/${tournament.slug}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    詳細
                  </Link>
                  <Link
                    href={`/admin/arena/tournaments/${tournament.slug}/edit`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    編集
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

