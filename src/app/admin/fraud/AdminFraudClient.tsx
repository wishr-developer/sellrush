"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  LogOut,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

type FraudFlag = {
  id: string;
  order_id: string;
  creator_id: string;
  brand_id: string;
  reason: string;
  severity: "low" | "medium" | "high";
  detected_at: string;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  note: string | null;
};

/**
 * Admin Fraud Client Component
 * 不正検知・監査画面
 */
export default function AdminFraudClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [editingFlag, setEditingFlag] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState("");

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
      await fetchFlags();
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Admin access check error:", error);
      }
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void checkAccessAndFetch();

    // リアルタイム更新: fraud_flags テーブルの変更を監視
    const channel = supabase
      .channel("admin-fraud-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fraud_flags",
        },
        async () => {
          // 本番環境ではログを出力しない（開発環境のみ）
          if (process.env.NODE_ENV === "development") {
            console.log("Fraud flags データが更新されました");
          }
          await fetchFlags();
        }
      )
      .subscribe();

    // クリーンアップ
    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkAccessAndFetch]);

  /**
   * 全 fraud_flags を取得
   * RLS により Admin のみ全件取得可能
   */
  const fetchFlags = async () => {
    try {
      const { data, error } = await supabase
        .from("fraud_flags")
        .select("*")
        .order("detected_at", { ascending: false });

      if (error) {
        // 本番環境では詳細なエラー情報をログに出力しない
        if (process.env.NODE_ENV === "development") {
          console.error("Fraud flags データの取得に失敗しました:", error);
        }
        setFlags([]);
        return;
      }

      if (!data || data.length === 0) {
        setFlags([]);
        return;
      }

      setFlags(data);
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない
      if (process.env.NODE_ENV === "development") {
        console.error("Fraud flags データの取得エラー:", error);
      }
      setFlags([]);
    }
  };

  /**
   * レビューステータスを更新
   */
  const handleToggleReview = async (flagId: string, currentReviewed: boolean) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("fraud_flags")
        .update({
          reviewed: !currentReviewed,
          reviewed_by: !currentReviewed ? user?.id || null : null,
        })
        .eq("id", flagId);

      if (error) {
        throw error;
      }

      await fetchFlags();
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない
      if (process.env.NODE_ENV === "development") {
        console.error("レビューステータス更新エラー:", error);
      }
      alert("レビューステータスの更新に失敗しました");
    }
  };

  /**
   * メモを更新
   */
  const handleUpdateNote = async (flagId: string) => {
    try {
      const { error } = await supabase
        .from("fraud_flags")
        .update({ note: editingNote })
        .eq("id", flagId);

      if (error) {
        throw error;
      }

      setEditingFlag(null);
      setEditingNote("");
      await fetchFlags();
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない
      if (process.env.NODE_ENV === "development") {
        console.error("メモ更新エラー:", error);
      }
      alert("メモの更新に失敗しました");
    }
  };

  /**
   * 重要度バッジの取得
   */
  const getSeverityBadge = (severity: FraudFlag["severity"]) => {
    const config = {
      low: {
        icon: AlertCircle,
        bg: "bg-blue-500/20",
        text: "text-blue-300",
        label: "Low",
      },
      medium: {
        icon: AlertTriangle,
        bg: "bg-amber-500/20",
        text: "text-amber-300",
        label: "Medium",
      },
      high: {
        icon: XCircle,
        bg: "bg-red-500/20",
        text: "text-red-300",
        label: "High",
      },
    };

    const severityConfig = config[severity];
    const Icon = severityConfig.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${severityConfig.bg} ${severityConfig.text}`}
      >
        <Icon className="w-3 h-3" />
        {severityConfig.label}
      </span>
    );
  };

  /**
   * 統計情報を計算
   */
  const stats = flags.reduce(
    (acc, flag) => {
      acc.total++;
      if (!flag.reviewed) acc.unreviewed++;
      if (flag.severity === "high") acc.high++;
      if (flag.severity === "medium") acc.medium++;
      if (flag.severity === "low") acc.low++;
      return acc;
    },
    { total: 0, unreviewed: 0, high: 0, medium: 0, low: 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Fraud Radar</h1>
            <p className="mt-1 text-sm text-slate-400">
              Fraud detection and audit management
            </p>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/orders"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Orders
            </Link>
            <Link
              href="/admin/payouts"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Payouts
            </Link>
            <Link
              href="/admin/users"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Users
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/login");
              }}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Log out
            </button>
          </nav>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-xs text-slate-400 mb-1">Total Flags</p>
            <p className="text-xl font-semibold text-white">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-xs text-slate-400 mb-1">Unreviewed</p>
            <p className="text-xl font-semibold text-amber-300">
              {stats.unreviewed}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-xs text-slate-400 mb-1">High</p>
            <p className="text-xl font-semibold text-red-300">{stats.high}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-xs text-slate-400 mb-1">Medium</p>
            <p className="text-xl font-semibold text-amber-300">
              {stats.medium}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-xs text-slate-400 mb-1">Low</p>
            <p className="text-xl font-semibold text-blue-300">{stats.low}</p>
          </div>
        </div>

        {/* Fraud Flags Table */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 overflow-hidden">
          {flags.length === 0 ? (
            <div className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">No fraud flags found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-zinc-900/50">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Order ID
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Creator ID
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Brand ID
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Reason
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Severity
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Reviewed
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Note
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Detected
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {flags.map((flag) => (
                    <tr
                      key={flag.id}
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        flag.severity === "high" && !flag.reviewed
                          ? "bg-red-500/5"
                          : ""
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-200 font-mono text-xs">
                        {flag.order_id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        {flag.creator_id
                          ? `${flag.creator_id.substring(0, 8)}...`
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        {flag.brand_id
                          ? `${flag.brand_id.substring(0, 8)}...`
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-200 max-w-xs">
                        <p className="truncate">{flag.reason}</p>
                      </td>
                      <td className="py-3 px-4">{getSeverityBadge(flag.severity)}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleReview(flag.id, flag.reviewed)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            flag.reviewed
                              ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                          }`}
                        >
                          {flag.reviewed ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Reviewed
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Unreviewed
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {editingFlag === flag.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingNote}
                              onChange={(e) => setEditingNote(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleUpdateNote(flag.id);
                                } else if (e.key === "Escape") {
                                  setEditingFlag(null);
                                  setEditingNote("");
                                }
                              }}
                              className="w-32 px-2 py-1 rounded bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="Add note..."
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateNote(flag.id)}
                              className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingFlag(null);
                                setEditingNote("");
                              }}
                              className="text-xs px-2 py-1 rounded bg-slate-500/20 text-slate-300 hover:bg-slate-500/30 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">
                              {flag.note || "-"}
                            </span>
                            <button
                              onClick={() => {
                                setEditingFlag(flag.id);
                                setEditingNote(flag.note || "");
                              }}
                              className="text-xs px-2 py-1 rounded bg-slate-500/20 text-slate-300 hover:bg-slate-500/30 transition-colors"
                            >
                              {flag.note ? "Edit" : "Add"}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {new Date(flag.detected_at).toLocaleString("ja-JP", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

