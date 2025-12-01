"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { DollarSign, LogOut, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

type Payout = {
  id: string;
  order_id: string;
  creator_id: string;
  brand_id: string;
  gross_amount: number;
  creator_amount: number;
  platform_amount: number;
  brand_amount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  created_at: string;
  updated_at: string;
};

type FraudFlag = {
  order_id: string;
  severity: "low" | "medium" | "high";
  reviewed: boolean;
};

/**
 * Admin Payouts Client Component
 * 全報酬分配・支払いの管理画面
 */
export default function AdminPayoutsClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [fraudFlags, setFraudFlags] = useState<Map<string, FraudFlag>>(
    new Map()
  );

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
      await fetchPayouts();
      await fetchFraudFlags();
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

    // リアルタイム更新: payouts テーブルの変更を監視
    const channel = supabase
      .channel("admin-payouts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payouts",
        },
        async () => {
          // 本番環境ではログを出力しない（開発環境のみ）
          if (process.env.NODE_ENV === "development") {
            console.log("Payouts データが更新されました");
          }
          await fetchPayouts();
        }
      )
      .subscribe();

    // クリーンアップ
    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkAccessAndFetch]);

  /**
   * Fraud flags を取得
   */
  const fetchFraudFlags = async () => {
    try {
      const { data } = await supabase
        .from("fraud_flags")
        .select("order_id, severity, reviewed")
        .eq("severity", "high")
        .eq("reviewed", false);

      if (data) {
        const flagsMap = new Map<string, FraudFlag>();
        data.forEach((flag) => {
          flagsMap.set(flag.order_id, flag);
        });
        setFraudFlags(flagsMap);
      }
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない
      if (process.env.NODE_ENV === "development") {
        console.error("Fraud flags 取得エラー:", error);
      }
    }
  };

  /**
   * 全 payouts を取得
   * RLS により Admin のみ全件取得可能
   */
  const fetchPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // 本番環境では詳細なエラー情報をログに出力しない
        if (process.env.NODE_ENV === "development") {
          console.error("Payouts データの取得に失敗しました:", error);
        }
        setPayouts([]);
        return;
      }

      if (!data || data.length === 0) {
        setPayouts([]);
        return;
      }

      setPayouts(data);
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない
      if (process.env.NODE_ENV === "development") {
        console.error("Payouts データの取得エラー:", error);
      }
      setPayouts([]);
    }
  };

  /**
   * Payouts を生成
   */
  const handleGeneratePayouts = async () => {
    setIsGenerating(true);
    setGenerateMessage(null);

    try {
      const response = await fetch("/api/payouts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Payouts の生成に失敗しました");
      }

      setGenerateMessage(
        `成功: ${result.generated} 件の payouts を生成しました`
      );
      await fetchPayouts();
    } catch (error: any) {
      // 本番環境では詳細なエラー情報をログに出力しない
      if (process.env.NODE_ENV === "development") {
        console.error("Payouts 生成エラー:", error);
      }
      setGenerateMessage(`エラー: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Payout ステータスを更新
   */
  const handleUpdateStatus = async (
    payoutId: string,
    newStatus: Payout["status"]
  ) => {
    try {
      const { error } = await supabase
        .from("payouts")
        .update({ status: newStatus })
        .eq("id", payoutId);

      if (error) {
        throw error;
      }

      await fetchPayouts();
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない
      if (process.env.NODE_ENV === "development") {
        console.error("ステータス更新エラー:", error);
      }
      alert("ステータスの更新に失敗しました");
    }
  };

  /**
   * ステータスバッジの取得
   */
  const getStatusBadge = (status: Payout["status"]) => {
    const config = {
      pending: {
        icon: Clock,
        bg: "bg-amber-500/20",
        text: "text-amber-300",
        label: "Pending",
      },
      approved: {
        icon: CheckCircle,
        bg: "bg-blue-500/20",
        text: "text-blue-300",
        label: "Approved",
      },
      paid: {
        icon: CheckCircle,
        bg: "bg-emerald-500/20",
        text: "text-emerald-300",
        label: "Paid",
      },
      rejected: {
        icon: XCircle,
        bg: "bg-red-500/20",
        text: "text-red-300",
        label: "Rejected",
      },
    };

    const statusConfig = config[status];
    const Icon = statusConfig.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
      >
        <Icon className="w-3 h-3" />
        {statusConfig.label}
      </span>
    );
  };

  /**
   * 合計金額を計算
   */
  const totals = payouts.reduce(
    (acc, payout) => ({
      gross: acc.gross + payout.gross_amount,
      creator: acc.creator + payout.creator_amount,
      platform: acc.platform + payout.platform_amount,
      brand: acc.brand + payout.brand_amount,
    }),
    { gross: 0, creator: 0, platform: 0, brand: 0 }
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
            <h1 className="text-2xl font-semibold text-white">Admin Payouts</h1>
            <p className="mt-1 text-sm text-slate-400">
              Payment distribution and management
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
              href="/admin/fraud"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Fraud
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

        {/* Generate Payouts Button */}
        <div className="mb-6">
          <button
            onClick={handleGeneratePayouts}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`}
            />
            {isGenerating ? "生成中..." : "Payouts を生成"}
          </button>
          {generateMessage && (
            <p
              className={`mt-2 text-sm ${
                generateMessage.startsWith("成功")
                  ? "text-emerald-300"
                  : "text-red-300"
              }`}
            >
              {generateMessage}
            </p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-xs text-slate-400 mb-1">Total Gross</p>
            <p className="text-xl font-semibold text-white">
              ¥{totals.gross.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-xs text-slate-400 mb-1">Creator (30%)</p>
            <p className="text-xl font-semibold text-emerald-300">
              ¥{totals.creator.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-xs text-slate-400 mb-1">Platform (30%)</p>
            <p className="text-xl font-semibold text-blue-300">
              ¥{totals.platform.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
            <p className="text-xs text-slate-400 mb-1">Brand (40%)</p>
            <p className="text-xl font-semibold text-amber-300">
              ¥{totals.brand.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 overflow-hidden">
          {payouts.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">No payouts found</p>
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
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">
                      Gross
                    </th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">
                      Creator (30%)
                    </th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">
                      Platform (30%)
                    </th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">
                      Brand (40%)
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Actions
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-200 font-mono text-xs">
                        {payout.order_id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        {payout.creator_id
                          ? `${payout.creator_id.substring(0, 8)}...`
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        {payout.brand_id
                          ? `${payout.brand_id.substring(0, 8)}...`
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-white font-semibold">
                        ¥{payout.gross_amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-300">
                        ¥{payout.creator_amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-300">
                        ¥{payout.platform_amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-300">
                        ¥{payout.brand_amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(payout.status)}
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const fraudFlag = fraudFlags.get(payout.order_id);
                          const hasHighSeverityUnreviewed =
                            fraudFlag?.severity === "high" &&
                            !fraudFlag?.reviewed;

                          if (hasHighSeverityUnreviewed) {
                            return (
                              <div className="flex flex-col gap-2">
                                <p className="text-xs text-red-300 font-medium">
                                  ⚠️ High severity fraud flag (unreviewed)
                                </p>
                                <Link
                                  href="/admin/fraud"
                                  className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors inline-block"
                                >
                                  Review in Fraud
                                </Link>
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center gap-2">
                              {payout.status === "pending" && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(payout.id, "approved")
                                    }
                                    className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateStatus(payout.id, "rejected")
                                    }
                                    className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {payout.status === "approved" && (
                                <button
                                  onClick={() =>
                                    handleUpdateStatus(payout.id, "paid")
                                  }
                                  className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                                >
                                  Mark Paid
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {new Date(payout.created_at).toLocaleString("ja-JP", {
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

          {/* Summary */}
          {payouts.length > 0 && (
            <div className="border-t border-white/10 px-4 py-3 bg-zinc-900/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  Total: {payouts.length} payouts
                </span>
                <div className="flex items-center gap-6">
                  <span className="text-emerald-300">
                    Creator: ¥{totals.creator.toLocaleString()}
                  </span>
                  <span className="text-blue-300">
                    Platform: ¥{totals.platform.toLocaleString()}
                  </span>
                  <span className="text-amber-300">
                    Brand: ¥{totals.brand.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

