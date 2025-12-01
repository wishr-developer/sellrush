"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";

type RangeKey = "today" | "7d" | "30d";

type PayoutRow = {
  id: string;
  creator_id?: string | null;
  brand_id?: string | null;
  gross_amount?: number | null;
  creator_amount?: number | null;
  platform_amount?: number | null;
  brand_amount?: number | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  flags: string[];
};

type DailyDistributionPoint = {
  date: string;
  creator_amount: number;
  platform_amount: number;
  brand_amount: number;
  gross_amount: number;
};

type StatusDataPoint = {
  name: string;
  count: number;
  amount: number;
  percentage: number;
};

/**
 * Admin Payouts 画面（支払い状況の一覧）
 */
export default function AdminPayoutsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPayouts = async () => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        let from: Date;
        if (range === "today") {
          from = new Date(
            Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
          );
        } else if (range === "7d") {
          from = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        } else {
          from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
        }

        const { data, error: fetchError } = await supabase
          .from("payouts")
          .select(
            "id, creator_id, brand_id, gross_amount, creator_amount, platform_amount, brand_amount, status, created_at, updated_at"
          )
          .gte("created_at", from.toISOString())
          .order("created_at", { ascending: false })
          .limit(1000);

        if (fetchError) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Admin Payouts: fetch error", fetchError);
          }
          if (!cancelled) {
            setError("データ取得に失敗しました。");
            setRows([]);
          }
          return;
        }

        if (!cancelled) {
          const mapped =
            (data as PayoutRow[] | null)?.map((r) => ({
              ...r,
              gross_amount: (r.gross_amount as number | null) ?? null,
              creator_amount: (r.creator_amount as number | null) ?? null,
              platform_amount: (r.platform_amount as number | null) ?? null,
              brand_amount: (r.brand_amount as number | null) ?? null,
              flags: [],
            })) ?? [];
          setRows(mapped);
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin Payouts: fetch exception", e);
        }
        if (!cancelled) {
          setError("データ取得中にエラーが発生しました。");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchPayouts();

    return () => {
      cancelled = true;
    };
  }, [range]);

  const {
    kpi,
    dailyDistribution,
    statusData,
    payoutsWithFlags,
    summaryMessage,
  } = useMemo(() => {
    if (rows.length === 0) {
      return {
        kpi: {
          totalPayouts: 0,
          pendingCount: 0,
          pendingAmount: 0,
          platformMarginRatio: 0,
          creatorShareRatio: 0,
          brandShareRatio: 0,
        },
        dailyDistribution: [],
        statusData: [],
        payoutsWithFlags: [],
        summaryMessage: "データがありません。",
      };
    }

    const now = new Date();
    let totalCreatorAmount = 0;
    let totalGrossAmount = 0;
    let totalPlatformAmount = 0;
    let totalBrandAmount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    const statusMap = new Map<string, { count: number; amount: number }>();
    const dailyMap = new Map<
      string,
      {
        creator_amount: number;
        platform_amount: number;
        brand_amount: number;
        gross_amount: number;
      }
    >();

    rows.forEach((r) => {
      const gross = r.gross_amount ?? 0;
      const creator = r.creator_amount ?? 0;
      const platform = r.platform_amount ?? 0;
      const brand = r.brand_amount ?? 0;
      const status = r.status ?? "pending";

      totalCreatorAmount += creator;
      totalGrossAmount += gross;
      totalPlatformAmount += platform;
      totalBrandAmount += brand;

      // ステータス別集計
      const current = statusMap.get(status) ?? { count: 0, amount: 0 };
      current.count += 1;
      current.amount += creator; // creator_amount ベース
      statusMap.set(status, current);

      if (status === "pending" || status === "approved") {
        pendingCount += 1;
        pendingAmount += creator;
      }

      // 日別集計
      if (r.created_at) {
        const createdAt = new Date(r.created_at);
        const dayKey = `${createdAt.getFullYear()}-${String(
          createdAt.getMonth() + 1
        ).padStart(2, "0")}-${String(createdAt.getDate()).padStart(2, "0")}`;
        const dayStats = dailyMap.get(dayKey) ?? {
          creator_amount: 0,
          platform_amount: 0,
          brand_amount: 0,
          gross_amount: 0,
        };
        dayStats.creator_amount += creator;
        dayStats.platform_amount += platform;
        dayStats.brand_amount += brand;
        dayStats.gross_amount += gross;
        dailyMap.set(dayKey, dayStats);
      }
    });

    // KPI 計算
    const platformMarginRatio =
      totalGrossAmount > 0 ? (totalPlatformAmount / totalGrossAmount) * 100 : 0;
    const creatorShareRatio =
      totalGrossAmount > 0 ? (totalCreatorAmount / totalGrossAmount) * 100 : 0;
    const brandShareRatio =
      totalGrossAmount > 0 ? (totalBrandAmount / totalGrossAmount) * 100 : 0;

    // 日別分配データ
    const dailyDistributionArr: DailyDistributionPoint[] = Array.from(
      dailyMap.entries()
    )
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, stats]) => ({
        date,
        ...stats,
      }));

    // ステータス別データ（件数 + 金額）
    const statusDataArr: StatusDataPoint[] = Array.from(statusMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        amount: data.amount,
        percentage: 0, // 後で計算
      }))
      .map((item) => {
        const totalAmount = Array.from(statusMap.values()).reduce(
          (sum, d) => sum + d.amount,
          0
        );
        item.percentage =
          totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
        return item;
      });

    // Payouts with Flags
    const payoutsWithFlagsArr: PayoutRow[] = rows.map((r) => {
      const flags: string[] = [];
      const gross = r.gross_amount ?? 0;
      const creator = r.creator_amount ?? 0;

      // Creator取り分の判定
      if (gross > 0) {
        const creatorRatio = creator / gross;
        if (creatorRatio < 0.2) {
          flags.push("Creator取り分低");
        } else if (creatorRatio > 0.5) {
          flags.push("Creator取り分高");
        }
      }

      // 支払遅延の判定
      if (
        (r.status === "pending" || r.status === "approved") &&
        r.created_at
      ) {
        const daysSinceCreated =
          (now.getTime() - new Date(r.created_at).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysSinceCreated >= 7) {
          flags.push("支払遅延");
        }
      }

      return {
        ...r,
        flags,
      };
    });

    // 経営者向け一文サマリ生成
    let summaryMessage = "";
    if (platformMarginRatio < 20) {
      summaryMessage = `⚠️ プラットフォーム取り分が想定より低い状態です。分配レートの見直し余地があります。`;
    } else if (pendingCount > 10 || pendingAmount > 100000) {
      summaryMessage = `⚠️ 未処理の支払いが多く、キャッシュフローや Creator 体験に影響する可能性があります。`;
    } else if (creatorShareRatio > 60) {
      summaryMessage = `Creator への分配比率が高く、プラットフォーム / ブランド側のマージンが圧迫されています。`;
    } else {
      summaryMessage = `✓ 分配バランスと支払いステータスは現時点では健全な状態です。`;
    }

    return {
      kpi: {
        totalPayouts: totalCreatorAmount,
        pendingCount,
        pendingAmount,
        platformMarginRatio,
        creatorShareRatio,
        brandShareRatio,
      },
      dailyDistribution: dailyDistributionArr,
      statusData: statusDataArr,
      payoutsWithFlags: payoutsWithFlagsArr,
      summaryMessage,
    };
  }, [rows]);

  return (
    <main className="min-h-screen bg-transparent text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-wide">
              キャッシュフロー・分配分析
            </h1>
            <p className="text-sm text-zinc-400">
              キャッシュフロー / 分配の健全性を見る経営画面
            </p>
          </div>
          {/* 範囲タブ */}
          <div className="rounded-full bg-black/60 border border-white/10 p-1 text-[11px] inline-flex">
            {[
              { key: "today", label: "Today" },
              { key: "7d", label: "Last 7 Days" },
              { key: "30d", label: "Last 30 Days" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setRange(item.key as RangeKey)}
                className={`px-3 py-1 rounded-full ${
                  range === item.key
                    ? "bg-white text-black"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {/* 経営者向け一文サマリ */}
        {summaryMessage && (
          <section className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3">
            <p
              className={`text-sm font-medium ${
                summaryMessage.includes("⚠️")
                  ? "text-amber-300"
                  : summaryMessage.includes("✓")
                  ? "text-emerald-300"
                  : "text-zinc-300"
              }`}
            >
              {summaryMessage}
            </p>
          </section>
        )}

        {/* 最上段KPI（キャッシュフロー指標） */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <CashflowKpiCard
            label="Total Payouts (Period)"
            value={`¥${kpi.totalPayouts.toLocaleString()}`}
            description="指定期間内の支払総額（creator_amount の合計）"
          />
          <CashflowKpiCard
            label="Pending Payouts"
            value={`${kpi.pendingCount} 件 / ¥${kpi.pendingAmount.toLocaleString()}`}
            description="status IN ('pending','approved') の件数と合計金額"
          />
          <CashflowKpiCard
            label="Platform Margin Ratio"
            value={`${kpi.platformMarginRatio.toFixed(1)}%`}
            description="(platform_amount 合計) / (gross_amount 合計)"
            isWarning={kpi.platformMarginRatio < 20}
          />
          <CashflowKpiCard
            label="Creator Share Ratio"
            value={`${kpi.creatorShareRatio.toFixed(1)}%`}
            description="(creator_amount 合計) / (gross_amount 合計)"
          />
          <CashflowKpiCard
            label="Brand Share Ratio"
            value={`${kpi.brandShareRatio.toFixed(1)}%`}
            description="(brand_amount 合計) / (gross_amount 合計)"
          />
        </section>

        {/* 分配構造の可視化（Stacked BarChart） */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <p className="mb-2 text-xs font-semibold text-zinc-300">
            分配構造の可視化（日別）
          </p>
          <p className="mb-3 text-[11px] text-zinc-500">
            日ごとの分配バランスが崩れていないか、どこかの比率だけが急に増減していないかを確認できます。
          </p>
          <div className="h-80">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                読み込み中…
              </div>
            ) : dailyDistribution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                データがありません。
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyDistribution}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.2)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    tickFormatter={(value: string) => {
                      const parts = value.split("-");
                      if (parts.length === 3) {
                        return `${parts[1]}/${parts[2]}`;
                      }
                      return value;
                    }}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    tickFormatter={(v) => `¥${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,0.4)",
                      fontSize: 11,
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      const gross = props.payload.gross_amount;
                      const percentage =
                        gross > 0 ? ((value / gross) * 100).toFixed(1) : "0.0";
                      const label =
                        name === "creator_amount"
                          ? "Creator"
                          : name === "platform_amount"
                          ? "Platform"
                          : "Brand";
                      return [
                        `¥${value.toLocaleString()} (${percentage}%)`,
                        label,
                      ];
                    }}
                    labelFormatter={(label: string) => {
                      const date = new Date(label);
                      return date.toLocaleDateString("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                      });
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", color: "#71717a" }}
                  />
                  <Bar
                    dataKey="creator_amount"
                    stackId="a"
                    fill="#38bdf8"
                    name="Creator"
                  />
                  <Bar
                    dataKey="platform_amount"
                    stackId="a"
                    fill="#f97316"
                    name="Platform"
                  />
                  <Bar
                    dataKey="brand_amount"
                    stackId="a"
                    fill="#a855f7"
                    name="Brand"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ステータス別構造（PieChart） */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <p className="mb-2 text-xs font-semibold text-zinc-300">
            Payout ステータス別内訳
          </p>
          <p className="mb-3 text-[11px] text-zinc-500">
            支払プロセスが詰まっていないか、Pending の比率が大きくなっていないかを視覚的に確認できます。
          </p>
          <div className="h-60">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                読み込み中…
              </div>
            ) : statusData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                データがありません。
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) =>
                      `${name}: ${percentage.toFixed(1)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {statusData.map((entry, index) => {
                      const colors = ["#f59e0b", "#38bdf8", "#10b981"];
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={colors[index % colors.length]}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,0.4)",
                      fontSize: 11,
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      if (name === "amount") {
                        return [
                          `¥${value.toLocaleString()} (${props.payload.percentage.toFixed(1)}%)`,
                          "金額",
                        ];
                      }
                      return [`${value} 件`, "件数"];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", color: "#71717a" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* テーブル（Payout 一覧 + フラグ） */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-300">
              Payout 一覧（判断補助）
            </p>
            {loading && (
              <p className="text-[11px] text-zinc-500">読み込み中…</p>
            )}
            {error && !loading && (
              <p className="text-[11px] text-red-400">{error}</p>
            )}
          </div>
          <div className="max-h-[480px] overflow-y-auto text-xs">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-zinc-950">
                <tr className="text-zinc-400">
                  <th className="px-2 py-2 text-left font-normal">Payout ID</th>
                  <th className="px-2 py-2 text-left font-normal">Creator ID</th>
                  <th className="px-2 py-2 text-right font-normal">Gross Amount</th>
                  <th className="px-2 py-2 text-right font-normal">Creator Amount</th>
                  <th className="px-2 py-2 text-right font-normal">Platform Amount</th>
                  <th className="px-2 py-2 text-right font-normal">Brand Amount</th>
                  <th className="px-2 py-2 text-left font-normal">Status</th>
                  <th className="px-2 py-2 text-left font-normal">Created At</th>
                  <th className="px-2 py-2 text-left font-normal">Flags</th>
                </tr>
              </thead>
              <tbody>
                {payoutsWithFlags.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-2 py-6 text-center text-zinc-500"
                    >
                      データがありません。
                    </td>
                  </tr>
                ) : (
                  payoutsWithFlags.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t border-zinc-800/80 text-[11px] hover:bg-zinc-900/70 ${
                        r.flags.length > 0 ? "text-amber-300" : ""
                      }`}
                    >
                      <td className="px-2 py-2">
                        {r.id.length > 12 ? `${r.id.slice(0, 8)}…` : r.id}
                      </td>
                      <td className="px-2 py-2">
                        {r.creator_id
                          ? r.creator_id.length > 12
                            ? `${r.creator_id.slice(0, 8)}…`
                            : r.creator_id
                          : "-"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        ¥{(r.gross_amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right">
                        ¥{(r.creator_amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right">
                        ¥{(r.platform_amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right">
                        ¥{(r.brand_amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
                            r.status === "paid"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : r.status === "approved"
                              ? "bg-sky-500/10 text-sky-300"
                              : "bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {r.status ?? "pending"}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString("ja-JP")
                          : "-"}
                      </td>
                      <td className="px-2 py-2">
                        {r.flags.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <span>⚠️</span>
                            <span className="text-[10px]">
                              {r.flags.join(", ")}
                            </span>
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

type CashflowKpiCardProps = {
  label: string;
  value: string;
  description: string;
  isWarning?: boolean;
};

function CashflowKpiCard({
  label,
  value,
  description,
  isWarning = false,
}: CashflowKpiCardProps) {
  return (
    <div
      className={`rounded-2xl border ${
        isWarning
          ? "border-amber-500/30 bg-amber-950/20"
          : "border-white/10 bg-zinc-950/80"
      } px-4 py-3`}
    >
      <p className="text-xs text-zinc-400">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          isWarning ? "text-amber-300" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">{description}</p>
    </div>
  );
}


