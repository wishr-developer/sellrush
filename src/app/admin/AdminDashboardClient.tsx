"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Building2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

/**
 * Admin Dashboard Client Component
 * KPI overview for administrators
 */
export default function AdminDashboardClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [fraudFlags, setFraudFlags] = useState<any[]>([]);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || user.user_metadata?.role !== "admin") {
          router.replace("/login");
          return;
        }

        setIsAuthorized(true);
        await fetchFraudFlags();
      } catch (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        // Adminアクセスエラーは重要なセキュリティイベントだが、詳細はログに残さない
        if (process.env.NODE_ENV === "development") {
          console.error("Admin access check error:", error);
        }
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    };

    void checkAccess();

    // リアルタイム更新: fraud_flags テーブルの変更を監視
    const channel = supabase
      .channel("admin-dashboard-fraud-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fraud_flags",
        },
        async () => {
          await fetchFraudFlags();
        }
      )
      .subscribe();

    // クリーンアップ
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  /**
   * Fraud flags を取得
   * 異常状態判定のために使用（最小限のデータのみ）
   */
  const fetchFraudFlags = async () => {
    try {
      const { data } = await supabase
        .from("fraud_flags")
        .select("severity, reviewed");

      if (data) {
        setFraudFlags(data);
      }
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない
      if (process.env.NODE_ENV === "development") {
        console.error("Fraud flags 取得エラー:", error);
      }
      setFraudFlags([]);
    }
  };

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

  // KPI data with meaning supplements
  // 判断のための意味補足: 事実のみを記載、評価・指示・感情は入れない
  const kpis = [
    {
      label: "Total GMV",
      value: "¥12,450,000",
      icon: DollarSign,
      color: "text-emerald-300",
      bgColor: "bg-emerald-500/20",
      meaning: "確定済み注文の合計金額です",
    },
    {
      label: "Orders Today",
      value: "1,247",
      icon: ShoppingCart,
      color: "text-sky-300",
      bgColor: "bg-sky-500/20",
      meaning: "全 Creator 経由の注文件数です",
    },
    {
      label: "Active Creators",
      value: "342",
      icon: Users,
      color: "text-amber-300",
      bgColor: "bg-amber-500/20",
      meaning: "直近で売上が発生した Creator 数です",
    },
    {
      label: "Active Brands",
      value: "28",
      icon: Building2,
      color: "text-purple-300",
      bgColor: "bg-purple-500/20",
      meaning: "商品を登録している Brand 数です",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">
              System overview and monitoring
            </p>
          </div>
          <nav className="flex items-center gap-4">
            {/* 主導線: Orders（最も重要な遷移先） */}
            {/* 理由: 売上の実体、Fraud / Payout の起点、全ての判断の源 */}
            <Link
              href="/admin/orders"
              className="text-sm font-medium text-slate-200 hover:text-white transition-colors"
            >
              Orders
            </Link>
            {/* 副導線: 視認性を下げる（必要な時だけ辿れる） */}
            <Link
              href="/admin/payouts"
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors opacity-60"
            >
              Payouts
            </Link>
            <Link
              href="/admin/fraud"
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors opacity-60"
            >
              Fraud
            </Link>
            <Link
              href="/admin/users"
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors opacity-60"
            >
              Users
            </Link>
            <Link
              href="/admin/arena/tournaments"
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors opacity-60"
            >
              Arena
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

        {/* 異常状態ガイダンスバー */}
        {(() => {
          // 既存取得データ（fraud_flags）を使用して状態判定
          const unreviewedFlags = fraudFlags.filter((f) => !f.reviewed);
          const highSeverityUnreviewed = unreviewedFlags.filter(
            (f) => f.severity === "high"
          );
          const hasLowOrMediumUnreviewed = unreviewedFlags.some(
            (f) => f.severity === "low" || f.severity === "medium"
          );

          let guidanceText = "";
          let GuidanceIcon = CheckCircle;
          let bgColor = "bg-emerald-500/10";
          let borderColor = "border-emerald-500/20";
          let textColor = "text-emerald-200";

          // ③ 危険状態（要即確認）
          if (highSeverityUnreviewed.length > 0) {
            guidanceText = "🚨 高リスクの取引が検知されています。";
            GuidanceIcon = AlertCircle;
            bgColor = "bg-red-500/10";
            borderColor = "border-red-500/20";
            textColor = "text-red-200";
          }
          // ② 注意状態（要確認）
          else if (unreviewedFlags.length > 0 && hasLowOrMediumUnreviewed) {
            guidanceText = "⚠️ 確認待ちの取引があります。内容を確認してください。";
            GuidanceIcon = AlertTriangle;
            bgColor = "bg-amber-500/10";
            borderColor = "border-amber-500/20";
            textColor = "text-amber-200";
          }
          // ① 正常状態（最頻出）
          else {
            guidanceText = "✅ 現在、確認が必要な異常はありません。";
            GuidanceIcon = CheckCircle;
            bgColor = "bg-emerald-500/10";
            borderColor = "border-emerald-500/20";
            textColor = "text-emerald-200";
          }

          return (
            <div
              className={`mb-6 rounded-lg border ${borderColor} ${bgColor} px-4 py-2.5`}
            >
              <div className="flex items-center gap-2.5">
                <GuidanceIcon className={`w-4 h-4 ${textColor} flex-shrink-0`} />
                <p className={`text-sm font-medium ${textColor}`}>
                  {guidanceText}
                </p>
              </div>
            </div>
          );
        })()}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${kpi.bgColor} flex items-center justify-center`}
                  >
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-1">{kpi.label}</p>
                <p className="text-2xl font-semibold text-white">{kpi.value}</p>
                {/* 判断のための意味補足: 数値の意味を明示（事実のみ） */}
                {kpi.meaning && (
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {kpi.meaning}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

