"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Trophy,
  ArrowLeft,
  Calendar,
  Package,
  Users,
  TrendingUp,
  AlertCircle,
  Save,
} from "lucide-react";
import type { TournamentWithProduct, TournamentRankingRow } from "@/lib/arena/types";

/**
 * Admin Tournament Detail Client Component
 * 
 * トーナメント詳細・編集画面
 * 
 * 機能:
 * - トーナメント詳細の表示
 * - トーナメント情報の編集
 * - ランキング表示（簡易版）
 * 
 * 認証:
 * - Admin ロールのみアクセス可能
 */
export default function AdminTournamentDetailClient() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [tournament, setTournament] = useState<TournamentWithProduct | null>(null);
  const [rankings, setRankings] = useState<TournamentRankingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 編集用フォームデータ
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "scheduled" as "scheduled" | "live" | "finished",
    startAt: "",
    endAt: "",
    productId: "",
  });

  /**
   * アクセスチェックとデータ取得
   */
  const checkAccessAndFetch = useCallback(async () => {
    if (!slug) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.user_metadata?.role !== "admin") {
        router.replace("/login");
        return;
      }

      setIsAuthorized(true);
      await fetchTournament();
      await fetchLeaderboard();
    } catch (err: any) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Admin tournament detail access check error:", err);
      }
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  }, [router, slug]);

  /**
   * トーナメント詳細を取得
   */
  const fetchTournament = useCallback(async () => {
    if (!slug) return;

    try {
      setError(null);
      const response = await fetch(`/api/arena/tournaments/${slug}`);

      if (!response.ok) {
        throw new Error("トーナメントの取得に失敗しました");
      }

      const data = await response.json();
      const tournamentData = data.tournament as TournamentWithProduct;
      setTournament(tournamentData);

      // フォームデータを初期化
      setFormData({
        title: tournamentData.title,
        description: tournamentData.description || "",
        status: tournamentData.status,
        startAt: tournamentData.startAt.slice(0, 16), // ISO 8601 から datetime-local 形式に変換
        endAt: tournamentData.endAt.slice(0, 16),
        productId: tournamentData.productId || "",
      });
    } catch (err: any) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Tournament fetch error:", err);
      }
      setError(err.message || "トーナメントの取得に失敗しました");
    }
  }, [slug]);

  /**
   * ランキングを取得
   */
  const fetchLeaderboard = useCallback(async () => {
    if (!slug) return;

    try {
      const response = await fetch(
        `/api/arena/tournaments/${slug}/leaderboard?limit=10`
      );

      if (!response.ok) {
        // ランキング取得失敗はエラーにしない（非必須）
        return;
      }

      const data = await response.json();
      setRankings(data.rankings || []);
    } catch (err: any) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Leaderboard fetch error:", err);
      }
      // ランキング取得失敗はエラーにしない（非必須）
    }
  }, [slug]);

  /**
   * トーナメントを更新
   */
  const handleSave = useCallback(async () => {
    if (!slug) return;

    setIsSaving(true);
    setError(null);

    try {
      // datetime-local 形式を ISO 8601 に変換
      const startAtISO = new Date(formData.startAt).toISOString();
      const endAtISO = new Date(formData.endAt).toISOString();

      const response = await fetch(`/api/admin/tournaments/${slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          status: formData.status,
          startAt: startAtISO,
          endAt: endAtISO,
          productId: formData.productId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "トーナメントの更新に失敗しました");
      }

      // データを再取得
      await fetchTournament();
      setIsEditing(false);
    } catch (err: any) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Tournament update error:", err);
      }
      setError(err.message || "トーナメントの更新に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }, [slug, formData, fetchTournament]);

  useEffect(() => {
    void checkAccessAndFetch();
  }, [checkAccessAndFetch]);

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

  if (!tournament) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-zinc-400 mb-2">
            トーナメントが見つかりません
          </p>
          <Link
            href="/admin/arena/tournaments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-black text-white pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ヘッダー */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/arena/tournaments"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              一覧に戻る
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                {tournament.title}
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                {tournament.slug}
              </p>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              編集
            </button>
          )}
        </header>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側: 基本情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報カード */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">基本情報</h2>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">
                      タイトル
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">
                      説明
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">
                      ステータス
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as "scheduled" | "live" | "finished",
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="scheduled">予定</option>
                      <option value="live">開催中</option>
                      <option value="finished">終了</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">
                        開始時刻
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.startAt}
                        onChange={(e) =>
                          setFormData({ ...formData, startAt: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">
                        終了時刻
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.endAt}
                        onChange={(e) =>
                          setFormData({ ...formData, endAt: e.target.value })
                        }
                        className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">
                      商品ID
                    </label>
                    <input
                      type="text"
                      value={formData.productId}
                      onChange={(e) =>
                        setFormData({ ...formData, productId: e.target.value })
                      }
                      placeholder="UUID"
                      className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? "保存中..." : "保存"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        // フォームデータをリセット
                        if (tournament) {
                          setFormData({
                            title: tournament.title,
                            description: tournament.description || "",
                            status: tournament.status,
                            startAt: tournament.startAt.slice(0, 16),
                            endAt: tournament.endAt.slice(0, 16),
                            productId: tournament.productId || "",
                          });
                        }
                      }}
                      className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">タイトル</p>
                    <p className="text-white">{tournament.title}</p>
                  </div>

                  {tournament.description && (
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">説明</p>
                      <p className="text-white">{tournament.description}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-zinc-400 mb-1">ステータス</p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                        tournament.status
                      )}`}
                    >
                      {getStatusLabel(tournament.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        開始時刻
                      </p>
                      <p className="text-white">{formatDate(tournament.startAt)}</p>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        終了時刻
                      </p>
                      <p className="text-white">{formatDate(tournament.endAt)}</p>
                    </div>
                  </div>

                  {tournament.product && (
                    <div>
                      <p className="text-xs text-zinc-400 mb-1 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        対象商品
                      </p>
                      <p className="text-white">{tournament.product.name}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        ¥{tournament.product.price.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ランキングカード */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Current Leaderboard
              </h2>

              {rankings.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">
                  ランキングデータがありません
                </p>
              ) : (
                <div className="space-y-2">
                  {rankings.map((ranking) => (
                    <div
                      key={ranking.influencerId}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-amber-400 w-8">
                          #{ranking.rank}
                        </span>
                        <div>
                          <p className="text-sm text-white">
                            {ranking.influencerName || ranking.influencerId.slice(0, 8) + "..."}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {ranking.totalOrders} 件の注文
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-400">
                          ¥{ranking.totalRevenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右側: 統計情報 */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                参加者数
              </h3>
              <p className="text-2xl font-bold text-white">{rankings.length}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                総売上
              </h3>
              <p className="text-2xl font-bold text-emerald-400">
                ¥{rankings.reduce((sum, r) => sum + r.totalRevenue, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

