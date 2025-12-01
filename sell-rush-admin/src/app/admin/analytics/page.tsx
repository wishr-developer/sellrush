"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";

type RangeKey = "today" | "7d" | "30d";

type OrderRow = {
  id: string;
  created_at: string;
  amount: number | null;
  status: string | null;
  creator_id?: string | null;
  product_id?: string | null;
  brand_id?: string | null;
};

type ChartPoint = {
  date: string;
  gmv: number;
  orders: number;
  previousGmv?: number;
  previousOrders?: number;
};

type HourBucket = {
  hour: number;
  count: number;
};

type StatusBucket = {
  status: string;
  count: number;
};

type RankingRow = {
  id: string;
  count: number;
  gmv: number;
};

type KpiSummary = {
  totalGmv: number;
  totalOrders: number;
  avgOrderValue: number;
  gmvGrowthRate: number | null; // 前期間比 %
  conversionProxy: number; // completed / all orders %
  peakHour: number | null;
  peakDay: string | null;
  riskIndicator: boolean; // 未レビュー Fraud があるか
  revenueConcentration: {
    topProductRatio: number; // 上位1商品のGMV比率
    topCreatorRatio: number; // 上位1CreatorのGMV比率
  };
};

/**
 * /admin/analytics
 * トレードターミナル風の Analytics 画面。
 * - 上段: KPI サマリー
 * - 中段: GMV エリアチャート + ステータス分布
 * - 下段: ランキング & 最新注文
 */
export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [previousOrders, setPreviousOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fraudFlags, setFraudFlags] = useState<Array<{ reviewed: boolean | null }>>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchOrders = async () => {
      setOrdersLoading(true);
      setError(null);
      try {
        const now = new Date();
        let from: Date;
        let previousFrom: Date;
        let previousTo: Date;
        
        if (range === "today") {
          from = new Date(
            Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
          );
          // 前期間は前日
          previousFrom = new Date(from.getTime() - 24 * 60 * 60 * 1000);
          previousTo = from;
        } else if (range === "7d") {
          from = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
          // 前期間は前週の同じ期間
          previousFrom = new Date(from.getTime() - 7 * 24 * 60 * 60 * 1000);
          previousTo = from;
        } else {
          // 30d
          from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
          // 前期間は前月の同じ期間
          previousFrom = new Date(from.getTime() - 30 * 24 * 60 * 60 * 1000);
          previousTo = from;
        }

        // 今期と前期のデータを並列取得
        const [currentRes, previousRes, fraudRes] = await Promise.all([
          supabase
            .from("orders")
            .select(
              "id, created_at, amount, status, creator_id, product_id, brand_id"
            )
            .gte("created_at", from.toISOString())
            .order("created_at", { ascending: true }),
          supabase
            .from("orders")
            .select(
              "id, created_at, amount, status, creator_id, product_id, brand_id"
            )
            .gte("created_at", previousFrom.toISOString())
            .lt("created_at", previousTo.toISOString())
            .order("created_at", { ascending: true }),
          supabase
            .from("fraud_flags")
            .select("reviewed")
            .eq("reviewed", false)
            .limit(1),
        ]);

        // エラーが実際に存在するか確認（null/undefined でなく、message または code が存在する場合のみ）
        const hasCurrentError =
          currentRes.error &&
          currentRes.error !== null &&
          typeof currentRes.error === "object" &&
          (currentRes.error.message || currentRes.error.code);
        const hasPreviousError =
          previousRes.error &&
          previousRes.error !== null &&
          typeof previousRes.error === "object" &&
          (previousRes.error.message || previousRes.error.code);

        if (hasCurrentError || hasPreviousError) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            if (hasCurrentError) {
              console.error("Admin Analytics: current orders 取得エラー", currentRes.error);
            }
            if (hasPreviousError) {
              console.error("Admin Analytics: previous orders 取得エラー", previousRes.error);
            }
          }
          if (!cancelled) {
            setError("データ取得に失敗しました。");
            setOrders([]);
            setPreviousOrders([]);
          }
        } else if (!cancelled) {
          if (currentRes.data) {
            setOrders(
              currentRes.data.map((row) => ({
                id: row.id as string,
                created_at: row.created_at as string,
                amount: (row.amount as number | null) ?? 0,
                status: (row.status as string | null) ?? null,
                creator_id: (row.creator_id as string | null) ?? null,
                product_id: (row.product_id as string | null) ?? null,
                brand_id: (row.brand_id as string | null) ?? null,
              }))
            );
          }
          if (previousRes.data) {
            setPreviousOrders(
              previousRes.data.map((row) => ({
                id: row.id as string,
                created_at: row.created_at as string,
                amount: (row.amount as number | null) ?? 0,
                status: (row.status as string | null) ?? null,
                creator_id: (row.creator_id as string | null) ?? null,
                product_id: (row.product_id as string | null) ?? null,
                brand_id: (row.brand_id as string | null) ?? null,
              }))
            );
          }
          if (fraudRes.data) {
            setFraudFlags(fraudRes.data);
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin Analytics: orders 取得例外", e);
        }
        if (!cancelled) {
          setError("データ取得中にエラーが発生しました。");
          setOrders([]);
          setPreviousOrders([]);
        }
      } finally {
        if (!cancelled) {
          setOrdersLoading(false);
        }
      }
    };

    void fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [range]);

  const {
    kpi,
    chartData,
    statusBuckets,
    productRanking,
    creatorRanking,
    latestOrders,
    hourlyData,
  } = useMemo(() => {
    if (!orders.length) {
      return {
        kpi: {
          totalGmv: 0,
          totalOrders: 0,
          avgOrderValue: 0,
          gmvGrowthRate: null,
          conversionProxy: 0,
          peakHour: null,
          peakDay: null,
          riskIndicator: false,
          revenueConcentration: {
            topProductRatio: 0,
            topCreatorRatio: 0,
          },
        } as KpiSummary,
        chartData: [] as ChartPoint[],
        statusBuckets: [] as StatusBucket[],
        productRanking: [] as RankingRow[],
        creatorRanking: [] as RankingRow[],
        latestOrders: [] as OrderRow[],
        hourlyData: [] as HourBucket[],
      };
    }

    // 今期の集計
    const dailyGmv = new Map<string, number>();
    const dailyOrders = new Map<string, number>();
    const previousDailyGmv = new Map<string, number>();
    const previousDailyOrders = new Map<string, number>();
    const hourlyMap = new Map<number, number>();
    const statusMap = new Map<string, number>();
    const productMap = new Map<string, { count: number; gmv: number }>();
    const creatorMap = new Map<string, { count: number; gmv: number }>();

    let totalGmv = 0;
    let totalCompletedOrders = 0;
    let totalOrders = 0;

    // 今期のデータを集計
    orders.forEach((o) => {
      const createdAt = new Date(o.created_at);
      const dayKey = `${createdAt.getFullYear()}-${String(
        createdAt.getMonth() + 1
      ).padStart(2, "0")}-${String(createdAt.getDate()).padStart(2, "0")}`;
      const hour = createdAt.getHours();

      const amount = o.amount ?? 0;
      const status = o.status ?? "unknown";

      // 時間帯別集計（全注文）
      hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + 1);

      if (status === "completed") {
        dailyGmv.set(dayKey, (dailyGmv.get(dayKey) ?? 0) + amount);
        dailyOrders.set(dayKey, (dailyOrders.get(dayKey) ?? 0) + 1);
        totalGmv += amount;
        totalCompletedOrders += 1;
      }

      statusMap.set(status, (statusMap.get(status) ?? 0) + 1);

      if (status === "completed" && o.product_id) {
        const current = productMap.get(o.product_id) ?? {
          count: 0,
          gmv: 0,
        };
        current.count += 1;
        current.gmv += amount;
        productMap.set(o.product_id, current);
      }

      if (status === "completed" && o.creator_id) {
        const current = creatorMap.get(o.creator_id) ?? {
          count: 0,
          gmv: 0,
        };
        current.count += 1;
        current.gmv += amount;
        creatorMap.set(o.creator_id, current);
      }

      totalOrders += 1;
    });

    // 前期のデータを集計
    let previousTotalGmv = 0;
    previousOrders.forEach((o) => {
      const createdAt = new Date(o.created_at);
      const dayKey = `${createdAt.getFullYear()}-${String(
        createdAt.getMonth() + 1
      ).padStart(2, "0")}-${String(createdAt.getDate()).padStart(2, "0")}`;
      const amount = o.amount ?? 0;
      const status = o.status ?? "unknown";

      if (status === "completed") {
        previousDailyGmv.set(dayKey, (previousDailyGmv.get(dayKey) ?? 0) + amount);
        previousDailyOrders.set(dayKey, (previousDailyOrders.get(dayKey) ?? 0) + 1);
        previousTotalGmv += amount;
      }
    });

    // 日別 GMV × Orders チャート用データ（今期 + 前期）
    const allDays = new Set([
      ...dailyGmv.keys(),
      ...dailyOrders.keys(),
      ...previousDailyGmv.keys(),
      ...previousDailyOrders.keys(),
    ]);
    const chartPoints: ChartPoint[] = Array.from(allDays)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((date) => ({
        date,
        gmv: dailyGmv.get(date) ?? 0,
        orders: dailyOrders.get(date) ?? 0,
        previousGmv: previousDailyGmv.get(date) ?? 0,
        previousOrders: previousDailyOrders.get(date) ?? 0,
      }));

    // 時間帯別集計（0-23時）
    const hourlyBuckets: HourBucket[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourlyMap.get(i) ?? 0,
    }));

    // Peak Hour 計算
    let peakHour: number | null = null;
    let maxHourCount = 0;
    hourlyBuckets.forEach((h) => {
      if (h.count > maxHourCount) {
        maxHourCount = h.count;
        peakHour = h.hour;
      }
    });

    // Peak Day 計算（GMV 最大の日）
    let peakDay: string | null = null;
    let maxDayGmv = 0;
    chartPoints.forEach((p) => {
      if (p.gmv > maxDayGmv) {
        maxDayGmv = p.gmv;
        peakDay = p.date;
      }
    });

    const statusBucketsArr: StatusBucket[] = Array.from(statusMap.entries())
      .map(([status, count]) => ({
        status,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const productRankingArr: RankingRow[] = Array.from(productMap.entries())
      .map(([id, value]) => ({ id, count: value.count, gmv: value.gmv }))
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 5);

    const creatorRankingArr: RankingRow[] = Array.from(creatorMap.entries())
      .map(([id, value]) => ({ id, count: value.count, gmv: value.gmv }))
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 5);

    const avgOrderValue =
      totalCompletedOrders > 0 ? totalGmv / totalCompletedOrders : 0;
    const conversionProxy =
      totalOrders > 0 ? (totalCompletedOrders / totalOrders) * 100 : 0;

    // GMV Growth Rate 計算（前期間比）
    let gmvGrowthRate: number | null = null;
    if (previousTotalGmv > 0) {
      gmvGrowthRate = ((totalGmv - previousTotalGmv) / previousTotalGmv) * 100;
    }

    // Revenue Concentration 計算
    const topProductRatio =
      productRankingArr.length > 0 && totalGmv > 0
        ? (productRankingArr[0].gmv / totalGmv) * 100
        : 0;
    const topCreatorRatio =
      creatorRankingArr.length > 0 && totalGmv > 0
        ? (creatorRankingArr[0].gmv / totalGmv) * 100
        : 0;

    // Risk Indicator（未レビュー Fraud があるか）
    const riskIndicator = fraudFlags.length > 0;

    const kpiSummary: KpiSummary = {
      totalGmv,
      totalOrders: totalCompletedOrders,
      avgOrderValue,
      gmvGrowthRate,
      conversionProxy,
      peakHour,
      peakDay,
      riskIndicator,
      revenueConcentration: {
        topProductRatio,
        topCreatorRatio,
      },
    };

    const latest = [...orders]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 20);

    return {
      kpi: kpiSummary,
      chartData: chartPoints,
      statusBuckets: statusBucketsArr,
      productRanking: productRankingArr,
      creatorRanking: creatorRankingArr,
      latestOrders: latest,
      hourlyData: hourlyBuckets,
    };
  }, [orders, previousOrders, fraudFlags]);

  return (
    <main className="min-h-screen bg-transparent text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* ヘッダー */}
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-wide">
              経営ダッシュボード
            </h1>
            <p className="text-sm text-zinc-400">
              毎日5分で意思決定できる経営指標とインサイト
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

        {/* 上段 KPI サマリー（経営指標） */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <ExecutiveKpiCard
            label="Total GMV"
            value={`¥${kpi.totalGmv.toLocaleString()}`}
            description="期間内の確定売上金額"
          />
          <ExecutiveKpiCard
            label="Orders"
            value={`${kpi.totalOrders.toLocaleString()} 件`}
            description="期間内の確定注文件数"
          />
          <ExecutiveKpiCard
            label="Average Order Value"
            value={
              kpi.totalOrders
                ? `¥${Math.round(kpi.avgOrderValue).toLocaleString()}`
                : "¥0"
            }
            description="1注文あたりの平均金額"
          />
          <ExecutiveKpiCard
            label="GMV Growth Rate"
            value={
              kpi.gmvGrowthRate !== null
                ? `${kpi.gmvGrowthRate >= 0 ? "+" : ""}${kpi.gmvGrowthRate.toFixed(1)}%`
                : "—"
            }
            description="前期間比の成長率"
            growthRate={kpi.gmvGrowthRate}
          />
          <ExecutiveKpiCard
            label="Conversion Proxy"
            value={`${kpi.conversionProxy.toFixed(1)}%`}
            description="completed / 全注文の割合"
          />
        </section>

        {/* 中段：GMV × Orders デュアルチャート（期間比較オーバーレイ） */}
        <section className="grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-zinc-300">GMV × Orders 推移</p>
                <p className="text-lg font-semibold text-white">
                  ¥{kpi.totalGmv.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-sky-500/60 rounded"></div>
                    <span>今期 GMV</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 border-t-2 border-dashed border-sky-500/40"></div>
                    <span>前期 GMV</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 border-t-2 border-orange-500"></div>
                    <span>今期 Orders</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 border-t-2 border-dashed border-orange-500/40"></div>
                    <span>前期 Orders</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="mb-3 text-[11px] text-zinc-500">
              今期と前期を同一スケールで比較。Tooltip で差分を確認できます。
            </p>
            <div className="h-80">
              {ordersLoading ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  読み込み中…
                </div>
              ) : error ? (
                <div className="flex h-full items-center justify-center text-xs text-red-400">
                  データ取得エラー
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  データがありません。
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="gmvGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                      yAxisId="left"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      tickFormatter={(v) => `¥${Math.round(v / 1000)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,0.4)",
                        fontSize: 11,
                      }}
                      formatter={(value: number, name: string, props: any) => {
                        if (name === "gmv") {
                          const diff = props.payload.previousGmv
                            ? value - props.payload.previousGmv
                            : 0;
                          const diffText =
                            diff !== 0
                              ? ` (${diff >= 0 ? "+" : ""}¥${Math.abs(diff).toLocaleString()})`
                              : "";
                          return [`¥${value.toLocaleString()}${diffText}`, "GMV"];
                        }
                        if (name === "orders") {
                          const diff = props.payload.previousOrders
                            ? value - props.payload.previousOrders
                            : 0;
                          const diffText =
                            diff !== 0 ? ` (${diff >= 0 ? "+" : ""}${Math.abs(diff)}件)` : "";
                          return [`${value} 件${diffText}`, "Orders"];
                        }
                        return [`${value}`, name];
                      }}
                      labelFormatter={(label: string) => {
                        const date = new Date(label);
                        return date.toLocaleDateString("ja-JP", {
                          month: "2-digit",
                          day: "2-digit",
                        });
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="gmv"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fill="url(#gmvGradient)"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="previousGmv"
                      stroke="#38bdf8"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      strokeOpacity={0.4}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="previousOrders"
                      stroke="#f97316"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      strokeOpacity={0.4}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        {/* 意思決定補助カード */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DecisionCard
            label="Peak Day"
            value={
              kpi.peakDay
                ? new Date(kpi.peakDay).toLocaleDateString("ja-JP", {
                    month: "2-digit",
                    day: "2-digit",
                  })
                : "—"
            }
            description="GMV が最大の日"
          />
          <DecisionCard
            label="Peak Hour"
            value={kpi.peakHour !== null ? `${kpi.peakHour}時` : "—"}
            description="注文が最も集中した時間帯"
          />
          <DecisionCard
            label="Risk Indicator"
            value={kpi.riskIndicator ? "⚠️ 要確認" : "✓ 正常"}
            description={
              kpi.riskIndicator
                ? "未レビュー Fraud があります"
                : "未レビュー Fraud はありません"
            }
            isWarning={kpi.riskIndicator}
          />
          <DecisionCard
            label="Revenue Concentration"
            value={`商品: ${kpi.revenueConcentration.topProductRatio.toFixed(1)}% / Creator: ${kpi.revenueConcentration.topCreatorRatio.toFixed(1)}%`}
            description={
              kpi.revenueConcentration.topProductRatio > 50 ||
              kpi.revenueConcentration.topCreatorRatio > 50
                ? "売上が特定商品/Creatorに集中しています"
                : "売上の分散は適切です"
            }
            isWarning={
              kpi.revenueConcentration.topProductRatio > 50 ||
              kpi.revenueConcentration.topCreatorRatio > 50
            }
          />
        </section>

        {/* 下段：経営者視点のランキング */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
            <p className="mb-2 text-xs font-semibold text-zinc-300">
              Top Products（GMV）
            </p>
            <p className="mb-3 text-[11px] text-zinc-500">
              商品別の売上上位5件。件数とGMVを併記。
            </p>
            <RankingTable
              rows={productRanking}
              idLabel="Product ID"
              linkPrefix="/admin/products?focus_product="
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
            <p className="mb-2 text-xs font-semibold text-zinc-300">
              Top Creators（GMV）
            </p>
            <p className="mb-3 text-[11px] text-zinc-500">
              Creator別の売上上位5名。件数とGMVを併記。
            </p>
            <RankingTable
              rows={creatorRanking}
              idLabel="Creator ID"
              linkPrefix="/admin/users?focus_creator="
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
            <p className="mb-2 text-xs font-semibold text-zinc-300">
              Latest Orders
            </p>
            <p className="mb-3 text-[11px] text-zinc-500">
              直近10件の注文サマリー（読み取り専用）。
            </p>
            <div className="max-h-[260px] overflow-y-auto space-y-2 text-[11px]">
              {ordersLoading ? (
                <p className="text-zinc-500">読み込み中…</p>
              ) : latestOrders.length === 0 ? (
                <p className="text-zinc-500">直近の注文はありません。</p>
              ) : (
                latestOrders.slice(0, 10).map((o) => (
                  <Link
                    key={o.id}
                    href={`/admin/orders?focus_order=${o.id}`}
                    prefetch={false}
                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-800/60 hover:text-emerald-300 ${
                      o.status === "completed"
                        ? "bg-emerald-500/5 text-emerald-200"
                        : "bg-zinc-800/70 text-zinc-200"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        ¥{(o.amount ?? 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(o.created_at).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        / {o.creator_id ?? "unknown creator"}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-300">
                      {o.status ?? "-"}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

type ExecutiveKpiCardProps = {
  label: string;
  value: string;
  description: string;
  growthRate?: number | null;
};

function ExecutiveKpiCard({
  label,
  value,
  description,
  growthRate,
}: ExecutiveKpiCardProps) {
  const hasGrowth = growthRate !== null && growthRate !== undefined;
  const isPositive = hasGrowth && growthRate >= 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-white">{value}</p>
        {hasGrowth && (
          <span
            className={`text-sm font-medium ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? "↑" : "↓"}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">{description}</p>
    </div>
  );
}

type DecisionCardProps = {
  label: string;
  value: string;
  description: string;
  isWarning?: boolean;
};

function DecisionCard({
  label,
  value,
  description,
  isWarning = false,
}: DecisionCardProps) {
  return (
    <div
      className={`rounded-2xl border ${
        isWarning ? "border-amber-500/30 bg-amber-950/20" : "border-white/10 bg-zinc-950/80"
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

type RankingTableProps = {
  rows: RankingRow[];
  idLabel: string;
  linkPrefix?: string;
};

function RankingTable({
  rows,
  idLabel,
  linkPrefix,
}: RankingTableProps) {
  const router = useRouter();

  if (!rows.length) {
    return (
      <div className="h-40 flex items-center justify-center text-[11px] text-zinc-500">
        データがありません。
      </div>
    );
  }

  return (
    <div className="text-[11px]">
      <table className="w-full border-collapse">
        <thead className="text-zinc-400">
          <tr>
            <th className="px-2 py-1 text-left font-normal">{idLabel}</th>
            <th className="px-2 py-1 text-right font-normal">件数</th>
            <th className="px-2 py-1 text-right font-normal">GMV</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={
                linkPrefix
                  ? () => router.push(`${linkPrefix}${row.id}`)
                  : undefined
              }
              className={`border-t border-zinc-800/80 ${
                linkPrefix
                  ? "cursor-pointer hover:bg-zinc-800/60 hover:text-emerald-300 transition-colors"
                  : "hover:bg-zinc-900/60"
              }`}
            >
              <td className="px-2 py-1 text-zinc-300">
                {linkPrefix ? (
                  <Link
                    href={`${linkPrefix}${row.id}`}
                    prefetch={false}
                    className="underline underline-offset-2 decoration-zinc-500 hover:decoration-emerald-400 hover:text-emerald-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {row.id.length > 12 ? `${row.id.slice(0, 8)}…` : row.id}
                  </Link>
                ) : (
                  row.id.length > 12 ? `${row.id.slice(0, 8)}…` : row.id
                )}
              </td>
              <td className="px-2 py-1 text-right text-zinc-300">
                {row.count.toLocaleString()}
              </td>
              <td className="px-2 py-1 text-right text-zinc-100">
                ¥{row.gmv.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

