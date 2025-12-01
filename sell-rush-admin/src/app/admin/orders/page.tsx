"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { buildCreatorStatsMap, buildProductStatsMap } from "./stats";
import type { CreatorStats, ProductStats } from "./types";

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

type StatusFilter = "all" | "completed" | "pending" | "cancelled";

/**
 * Admin 注文一覧画面（読み取り専用）
 * - 運営が期間・ステータスごとの注文状況を俯瞰できるようにする。
 */
type DailyStatusPoint = {
  date: string;
  completed: number;
  pending: number;
  cancelled: number;
  previousCompleted?: number;
  previousPending?: number;
  previousCancelled?: number;
};

type OrderWithAge = OrderRow & {
  ageHours: number;
  flags: string[];
};

type DetailMode = "creator" | "product" | null;

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const focusedOrderId = searchParams.get("focus_order") || null;
  const focusedCreatorId = searchParams.get("focus_creator") || null;
  const focusedRowRef = useRef<HTMLTableRowElement>(null);

  const [range, setRange] = useState<RangeKey>("7d");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [previousOrders, setPreviousOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<DetailMode>(null);
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOrders = async () => {
      setLoading(true);
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
          previousFrom = new Date(from.getTime() - 24 * 60 * 60 * 1000);
          previousTo = from;
        } else if (range === "7d") {
          from = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
          previousFrom = new Date(from.getTime() - 7 * 24 * 60 * 60 * 1000);
          previousTo = from;
        } else {
          from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
          previousFrom = new Date(from.getTime() - 30 * 24 * 60 * 60 * 1000);
          previousTo = from;
        }

        // 今期と前期のデータを並列取得
        let currentQuery = supabase
          .from("orders")
          .select(
            "id, created_at, amount, status, creator_id, product_id, brand_id"
          )
          .gte("created_at", from.toISOString())
          .order("created_at", { ascending: false });

        if (statusFilter !== "all") {
          currentQuery = currentQuery.eq("status", statusFilter);
        }

        const [currentRes, previousRes] = await Promise.all([
          currentQuery,
          supabase
            .from("orders")
            .select(
              "id, created_at, amount, status, creator_id, product_id, brand_id"
            )
            .gte("created_at", previousFrom.toISOString())
            .lt("created_at", previousTo.toISOString())
            .order("created_at", { ascending: false }),
        ]);

        const { data, error: fetchError } = currentRes;

        // エラーが実際に存在するか確認（null/undefined でなく、message または code が存在する場合のみ）
        const hasCurrentError =
          fetchError &&
          fetchError !== null &&
          typeof fetchError === "object" &&
          (fetchError.message || fetchError.code);
        const hasPreviousError =
          previousRes.error &&
          previousRes.error !== null &&
          typeof previousRes.error === "object" &&
          (previousRes.error.message || previousRes.error.code);

        if (hasCurrentError || hasPreviousError) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            if (hasCurrentError) {
              console.error("Admin Orders: current orders 取得エラー", fetchError);
            }
            if (hasPreviousError) {
              console.error("Admin Orders: previous orders 取得エラー", previousRes.error);
            }
          }
          if (!cancelled) {
            setError("データ取得に失敗しました。");
            setOrders([]);
            setPreviousOrders([]);
          }
          return;
        }

        if (!cancelled) {
          if (data) {
            setOrders(
              data.map((row) => ({
                id: row.id as string,
                created_at: row.created_at as string,
                amount: (row.amount as number | null) ?? null,
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
                amount: (row.amount as number | null) ?? null,
                status: (row.status as string | null) ?? null,
                creator_id: (row.creator_id as string | null) ?? null,
                product_id: (row.product_id as string | null) ?? null,
                brand_id: (row.brand_id as string | null) ?? null,
              }))
            );
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin Orders: orders 取得例外", e);
        }
        if (!cancelled) {
          setError("データ取得中にエラーが発生しました。");
          setOrders([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [range, statusFilter]);

  const {
    kpi,
    statusBuckets,
    dailyStatusData,
    ordersWithAge,
    summaryMessage,
  } = useMemo(() => {
    // 今期の集計
    const stats = {
      totalGmv: 0,
      totalCount: orders.length,
      completedCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
      statusMap: new Map<string, number>(),
      dailyStatusMap: new Map<
        string,
        { completed: number; pending: number; cancelled: number }
      >(),
    };

    const now = new Date();
    orders.forEach((o) => {
      const status = o.status ?? "unknown";
      stats.statusMap.set(status, (stats.statusMap.get(status) ?? 0) + 1);

      if (o.status === "completed") {
        stats.totalGmv += o.amount ?? 0;
        stats.completedCount += 1;
      } else if (o.status === "pending") {
        stats.pendingCount += 1;
      } else if (o.status === "cancelled") {
        stats.cancelledCount += 1;
      }

      // 日別ステータス集計
      const createdAt = new Date(o.created_at);
      const dayKey = `${createdAt.getFullYear()}-${String(
        createdAt.getMonth() + 1
      ).padStart(2, "0")}-${String(createdAt.getDate()).padStart(2, "0")}`;
      const dayStats = stats.dailyStatusMap.get(dayKey) ?? {
        completed: 0,
        pending: 0,
        cancelled: 0,
      };
      if (status === "completed") dayStats.completed += 1;
      if (status === "pending") dayStats.pending += 1;
      if (status === "cancelled") dayStats.cancelled += 1;
      stats.dailyStatusMap.set(dayKey, dayStats);
    });

    // 前期の集計
    const previousDailyStatusMap = new Map<
      string,
      { completed: number; pending: number; cancelled: number }
    >();
    previousOrders.forEach((o) => {
      const createdAt = new Date(o.created_at);
      const dayKey = `${createdAt.getFullYear()}-${String(
        createdAt.getMonth() + 1
      ).padStart(2, "0")}-${String(createdAt.getDate()).padStart(2, "0")}`;
      const status = o.status ?? "unknown";
      const dayStats = previousDailyStatusMap.get(dayKey) ?? {
        completed: 0,
        pending: 0,
        cancelled: 0,
      };
      if (status === "completed") dayStats.completed += 1;
      if (status === "pending") dayStats.pending += 1;
      if (status === "cancelled") dayStats.cancelled += 1;
      previousDailyStatusMap.set(dayKey, dayStats);
    });

    // KPI 計算
    const avgOrderValue =
      stats.completedCount > 0 ? stats.totalGmv / stats.completedCount : 0;
    const completionRate =
      stats.totalCount > 0
        ? (stats.completedCount / stats.totalCount) * 100
        : 0;
    const cancelPendingRate =
      stats.totalCount > 0
        ? ((stats.cancelledCount + stats.pendingCount) / stats.totalCount) * 100
        : 0;

    // ステータス別バケット（前期比較用）
    const previousStatusMap = new Map<string, number>();
    previousOrders.forEach((o) => {
      const status = o.status ?? "unknown";
      previousStatusMap.set(
        status,
        (previousStatusMap.get(status) ?? 0) + 1
      );
    });

    const statusBucketsArr = Array.from(stats.statusMap.entries()).map(
      ([status, count]) => ({
        status,
        count,
        previousCount: previousStatusMap.get(status) ?? 0,
      })
    );

    // 日別ステータスデータ（時系列異常検知用）
    const allDays = new Set([
      ...stats.dailyStatusMap.keys(),
      ...previousDailyStatusMap.keys(),
    ]);
    const dailyStatusDataArr: DailyStatusPoint[] = Array.from(allDays)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((date) => {
        const current = stats.dailyStatusMap.get(date) ?? {
          completed: 0,
          pending: 0,
          cancelled: 0,
        };
        const previous = previousDailyStatusMap.get(date) ?? {
          completed: 0,
          pending: 0,
          cancelled: 0,
        };
        return {
          date,
          completed: current.completed,
          pending: current.pending,
          cancelled: current.cancelled,
          previousCompleted: previous.completed,
          previousPending: previous.pending,
          previousCancelled: previous.cancelled,
        };
      });

    // Orders with Age & Flags
    const creatorCancelRateMap = new Map<string, number>();
    const productCancelRateMap = new Map<string, number>();
    orders.forEach((o) => {
      if (o.creator_id) {
        const creatorOrders = orders.filter(
          (ord) => ord.creator_id === o.creator_id
        );
        const cancelledCount = creatorOrders.filter(
          (ord) => ord.status === "cancelled"
        ).length;
        if (creatorOrders.length > 0) {
          creatorCancelRateMap.set(
            o.creator_id,
            (cancelledCount / creatorOrders.length) * 100
          );
        }
      }
      if (o.product_id) {
        const productOrders = orders.filter(
          (ord) => ord.product_id === o.product_id
        );
        const cancelledCount = productOrders.filter(
          (ord) => ord.status === "cancelled"
        ).length;
        if (productOrders.length > 0) {
          productCancelRateMap.set(
            o.product_id,
            (cancelledCount / productOrders.length) * 100
          );
        }
      }
    });

    const ordersWithAgeArr: OrderWithAge[] = orders.map((o) => {
      const createdAt = new Date(o.created_at);
      const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      const flags: string[] = [];

      // Pending が X時間以上
      if (o.status === "pending" && ageHours >= 24) {
        flags.push("Pending長期");
      }

      // Cancelled 率が高い Creator / Product
      if (o.creator_id) {
        const cancelRate = creatorCancelRateMap.get(o.creator_id) ?? 0;
        if (cancelRate > 30) {
          flags.push("Creator高取消率");
        }
      }
      if (o.product_id) {
        const cancelRate = productCancelRateMap.get(o.product_id) ?? 0;
        if (cancelRate > 30) {
          flags.push("Product高取消率");
        }
      }

      return {
        ...o,
        ageHours,
        flags,
      };
    });

    // 経営者向け一文サマリ生成
    let summaryMessage = "";
    if (stats.totalCount === 0) {
      summaryMessage = "データがありません。";
    } else if (completionRate < 70) {
      summaryMessage = `⚠️ 完了率が ${completionRate.toFixed(1)}% と低く、売上品質に懸念があります。`;
    } else if (cancelPendingRate > 20) {
      summaryMessage = `⚠️ キャンセル・保留率が ${cancelPendingRate.toFixed(1)}% と高く、異常兆候が見られます。`;
    } else if (stats.pendingCount > 0) {
      const longPendingCount = ordersWithAgeArr.filter(
        (o) => o.status === "pending" && o.ageHours >= 24
      ).length;
      if (longPendingCount > 0) {
        summaryMessage = `⚠️ ${longPendingCount}件の長期保留注文があります。特定Creatorに集中している可能性があります。`;
      } else {
        summaryMessage = "✓ 全体の売上品質は安定しています。";
      }
    } else {
      summaryMessage = "✓ 全体の売上品質は安定しています。";
    }

    return {
      kpi: {
        totalOrders: stats.totalCount,
        completedOrders: stats.completedCount,
        completionRate,
        totalGmv: stats.totalGmv,
        avgOrderValue,
        cancelPendingRate,
      },
      statusBuckets: statusBucketsArr,
      dailyStatusData: dailyStatusDataArr,
      ordersWithAge: ordersWithAgeArr,
      summaryMessage,
    };
  }, [orders, previousOrders]);

  // Creator ごとの集計
  // Creator ごとの集計（関数に切り出し）
  const creatorStatsMap = useMemo(
    () => buildCreatorStatsMap(orders),
    [orders]
  );

  // Product ごとの集計（関数に切り出し）
  const productStatsMap = useMemo(
    () => buildProductStatsMap(orders),
    [orders]
  );

  // フォーカス行への自動スクロール
  useEffect(() => {
    if (focusedRowRef.current && (focusedOrderId || focusedCreatorId)) {
      // データ読み込み完了後にスクロール
      setTimeout(() => {
        focusedRowRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }
  }, [focusedOrderId, focusedCreatorId, ordersWithAge]);

  // モーダル関連の補助値
  const isDetailOpen = detailMode !== null && detailTargetId !== null;

  const closeDetail = () => {
    setDetailMode(null);
    setDetailTargetId(null);
  };

  const detailCreator =
    detailMode === "creator" && detailTargetId
      ? creatorStatsMap.get(detailTargetId) ?? null
      : null;

  const detailProduct =
    detailMode === "product" && detailTargetId
      ? productStatsMap.get(detailTargetId) ?? null
      : null;

  return (
    <main className="min-h-screen bg-transparent text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-wide">
            注文管理・品質監視
          </h1>
          <p className="text-sm text-zinc-400">
            売上の実態・品質・異常を一瞬で把握できる管理画面
          </p>
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

        {/* フィルタバー */}
        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">期間</span>
            <div className="inline-flex gap-1 rounded-full bg-black/40 border border-zinc-800 p-1">
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
                      ? "bg-white/90 text-black"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-zinc-400">ステータス</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
                className="rounded-md bg-black border border-zinc-800 px-2 py-1 text-xs text-zinc-100"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </section>

        {/* 上段KPI（売上品質指標） */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <QualityKpiCard
            label="Orders"
            value={`${kpi.totalOrders.toLocaleString()} 件`}
            description="期間内の全注文件数"
          />
          <QualityKpiCard
            label="Completed Orders"
            value={`${kpi.completedOrders.toLocaleString()} 件`}
            description="完了済み注文件数"
          />
          <QualityKpiCard
            label="Completion Rate"
            value={`${kpi.completionRate.toFixed(1)}%`}
            description="完了率（completed / 全注文）"
            isWarning={kpi.completionRate < 70}
          />
          <QualityKpiCard
            label="GMV"
            value={`¥${kpi.totalGmv.toLocaleString()}`}
            description="完了済み注文の売上合計"
          />
          <QualityKpiCard
            label="Average Order Value"
            value={
              kpi.completedOrders > 0
                ? `¥${Math.round(kpi.avgOrderValue).toLocaleString()}`
                : "¥0"
            }
            description="1注文あたりの平均金額"
          />
          <QualityKpiCard
            label="Cancel / Pending Rate"
            value={`${kpi.cancelPendingRate.toFixed(1)}%`}
            description="異常兆候率（cancel+pending / 全注文）"
            isWarning={kpi.cancelPendingRate > 20}
          />
        </section>

        {/* ステータス分析（前期間比較） */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <p className="mb-2 text-xs font-semibold text-zinc-300">
            ステータス別注文数（前期間比較）
          </p>
          <p className="mb-3 text-[11px] text-zinc-500">
            今期と前期を比較。「不調は需要か、運用か？」を判断できます。
          </p>
          <div className="h-60">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                読み込み中…
              </div>
            ) : statusBuckets.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                データがありません。
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBuckets}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.2)"
                  />
                  <XAxis
                    dataKey="status"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,0.4)",
                      fontSize: 11,
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      if (name === "count") {
                        const diff = props.payload.previousCount
                          ? value - props.payload.previousCount
                          : 0;
                        const diffText =
                          diff !== 0 ? ` (${diff >= 0 ? "+" : ""}${diff}件)` : "";
                        return [`${value} 件${diffText}`, "今期"];
                      }
                      return [`${value} 件`, "前期"];
                    }}
                  />
                  <Bar dataKey="count" radius={4}>
                    {statusBuckets.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.status === "completed"
                            ? "#10b981"
                            : entry.status === "pending"
                            ? "#f59e0b"
                            : entry.status === "cancelled"
                            ? "#ef4444"
                            : "#71717a"
                        }
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="previousCount" radius={4} fill="#71717a" opacity={0.3} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* 時系列異常検知チャート */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <p className="mb-2 text-xs font-semibold text-zinc-300">
            Cancelled / Pending Orders（日別推移）
          </p>
          <p className="mb-3 text-[11px] text-zinc-500">
            日別の異常注文数。急増ポイントが視覚的に分かります。
          </p>
          <div className="h-60">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                読み込み中…
              </div>
            ) : dailyStatusData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                データがありません。
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyStatusData}>
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
                  <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,0.4)",
                      fontSize: 11,
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      // 前期との差分を表示（前日比は実装が複雑なため、前期比で代替）
                      const prevValue =
                        name === "pending"
                          ? props.payload.previousPending
                          : name === "cancelled"
                          ? props.payload.previousCancelled
                          : 0;
                      const diff = prevValue ? value - prevValue : 0;
                      const diffText =
                        diff !== 0 ? ` (前期比: ${diff >= 0 ? "+" : ""}${diff}件)` : "";
                      return [`${value} 件${diffText}`, name];
                    }}
                    labelFormatter={(label: string) => {
                      const date = new Date(label);
                      return date.toLocaleDateString("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                      });
                    }}
                  />
                  <Bar dataKey="pending" fill="#f59e0b" radius={4} />
                  <Bar dataKey="cancelled" fill="#ef4444" radius={4} />
                  <Line
                    type="monotone"
                    dataKey="previousPending"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    strokeOpacity={0.4}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="previousCancelled"
                    stroke="#ef4444"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    strokeOpacity={0.4}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* テーブル */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-300">
              注文テーブル
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
                  <th className="px-2 py-2 text-left font-normal">日時</th>
                  <th className="px-2 py-2 text-left font-normal">Order ID</th>
                  <th className="px-2 py-2 text-right font-normal">金額</th>
                  <th className="px-2 py-2 text-left font-normal">Status</th>
                  <th className="px-2 py-2 text-left font-normal">Order Age</th>
                  <th className="px-2 py-2 text-left font-normal">Creator</th>
                  <th className="px-2 py-2 text-left font-normal">Product</th>
                  <th className="px-2 py-2 text-left font-normal">フラグ</th>
                </tr>
              </thead>
              <tbody>
                {ordersWithAge.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-2 py-6 text-center text-zinc-500"
                    >
                      データがありません。
                    </td>
                  </tr>
                ) : (
                  ordersWithAge.map((order, index) => {
                    const ageText =
                      order.ageHours < 24
                        ? `${Math.round(order.ageHours)}時間`
                        : `${Math.round(order.ageHours / 24)}日`;
                    const isFocusedRow =
                      (focusedOrderId && order.id === focusedOrderId) ||
                      (!focusedOrderId &&
                        focusedCreatorId &&
                        order.creator_id === focusedCreatorId);
                    // 最初に見つかったフォーカス行のみに ref を割り当て
                    const isFirstFocusedRow =
                      isFocusedRow &&
                      ordersWithAge.findIndex((o) => {
                        if (focusedOrderId) {
                          return o.id === focusedOrderId;
                        }
                        if (focusedCreatorId) {
                          return o.creator_id === focusedCreatorId;
                        }
                        return false;
                      }) === index;
                    return (
                    <tr
                      key={order.id}
                      ref={isFirstFocusedRow ? focusedRowRef : null}
                      className={`border-t border-zinc-800/80 text-[11px] hover:bg-zinc-900/70 ${
                        isFocusedRow
                          ? "border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]"
                          : ""
                      }`}
                    >
                      <td className="px-2 py-2 text-zinc-300">
                        {new Date(order.created_at).toLocaleString("ja-JP", {
                          year: "2-digit",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-2 py-2 text-zinc-400">
                        {order.id.slice(0, 8)}…
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-100">
                        ¥{(order.amount ?? 0).toLocaleString()}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
                            order.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : order.status === "pending"
                              ? "bg-amber-500/10 text-amber-300"
                              : order.status === "cancelled"
                              ? "bg-red-500/10 text-red-300"
                              : "bg-zinc-800 text-zinc-300"
                          }`}
                        >
                          {order.status ?? "-"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-zinc-400">
                        {ageText}
                      </td>
                      <td
                        className={`px-2 py-2 ${
                          order.creator_id
                            ? "text-zinc-400 underline underline-offset-2 cursor-pointer hover:text-emerald-400"
                            : "text-zinc-400"
                        }`}
                        onClick={() => {
                          if (!order.creator_id) return;
                          setDetailMode("creator");
                          setDetailTargetId(String(order.creator_id));
                        }}
                      >
                        {order.creator_id
                          ? order.creator_id.length > 12
                            ? `${order.creator_id.slice(0, 8)}…`
                            : order.creator_id
                          : "-"}
                      </td>
                      <td
                        className={`px-2 py-2 ${
                          order.product_id
                            ? "text-zinc-400 underline underline-offset-2 cursor-pointer hover:text-emerald-400"
                            : "text-zinc-400"
                        }`}
                        onClick={() => {
                          if (!order.product_id) return;
                          setDetailMode("product");
                          setDetailTargetId(String(order.product_id));
                        }}
                      >
                        {order.product_id
                          ? order.product_id.length > 12
                            ? `${order.product_id.slice(0, 8)}…`
                            : order.product_id
                          : "-"}
                      </td>
                      <td className="px-2 py-2">
                        {order.flags.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <span>⚠️</span>
                            <span className="text-[10px]">
                              {order.flags.join(", ")}
                            </span>
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Creator / Product 詳細モーダル */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {detailMode === "creator" ? "Creator Insight" : "Product Insight"}
                </p>
                <h2 className="text-sm font-semibold text-zinc-100 break-all">
                  {detailTargetId}
                </h2>
              </div>
              <button
                onClick={closeDetail}
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>

            {/* Creator 詳細 */}
            {detailMode === "creator" && detailCreator && (
              <div className="space-y-3 text-xs text-zinc-300">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[11px] text-zinc-500">累計GMV</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-400">
                      ¥{detailCreator.gmv.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[11px] text-zinc-500">注文件数</p>
                    <p className="mt-1 text-sm font-semibold">
                      {detailCreator.orders} 件
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[11px] text-zinc-500">完了率</p>
                    <p className="mt-1 text-sm font-semibold">
                      {detailCreator.orders === 0
                        ? "-"
                        : `${Math.round(
                            (detailCreator.completedOrders / detailCreator.orders) *
                              100
                          )}%`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[11px] text-zinc-500">キャンセル率</p>
                    <p className="mt-1 text-sm font-semibold">
                      {detailCreator.orders === 0
                        ? "-"
                        : `${Math.round(
                            (detailCreator.cancelledOrders / detailCreator.orders) *
                              100
                          )}%`}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                  <p className="mb-1 text-[11px] text-zinc-500">
                    最近の注文（最大5件）
                  </p>
                  <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                    {orders
                      .filter((o) => String(o.creator_id) === detailCreator.creatorId)
                      .sort(
                        (a, b) =>
                          new Date(b.created_at ?? 0).getTime() -
                          new Date(a.created_at ?? 0).getTime()
                      )
                      .slice(0, 5)
                      .map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between rounded border border-zinc-800/60 bg-zinc-900/80 px-2 py-1"
                        >
                          <span className="text-[11px] text-zinc-400">
                            {o.created_at
                              ? new Date(o.created_at).toLocaleString("ja-JP", {
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </span>
                          <span className="text-[11px]">
                            ¥{Number(o.amount ?? 0).toLocaleString()}
                          </span>
                          <span className="text-[11px] capitalize text-zinc-400">
                            {o.status}
                          </span>
                        </div>
                      ))}
                    {orders.filter(
                      (o) => String(o.creator_id) === detailCreator.creatorId
                    ).length === 0 && (
                      <p className="text-[11px] text-zinc-500">
                        この Creator の注文データがまだありません。
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Product 詳細 */}
            {detailMode === "product" && detailProduct && (
              <div className="space-y-3 text-xs text-zinc-300">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[11px] text-zinc-500">累計GMV</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-400">
                      ¥{detailProduct.gmv.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[11px] text-zinc-500">注文件数</p>
                    <p className="mt-1 text-sm font-semibold">
                      {detailProduct.orders} 件
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[11px] text-zinc-500">完了率</p>
                    <p className="mt-1 text-sm font-semibold">
                      {detailProduct.orders === 0
                        ? "-"
                        : `${Math.round(
                            (detailProduct.completedOrders / detailProduct.orders) *
                              100
                          )}%`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[11px] text-zinc-500">最終注文日</p>
                    <p className="mt-1 text-[11px]">
                      {detailProduct.lastOrderAt
                        ? new Date(detailProduct.lastOrderAt).toLocaleString(
                            "ja-JP",
                            {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                  <p className="mb-1 text-[11px] text-zinc-500">
                    最近の注文（最大5件）
                  </p>
                  <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                    {orders
                      .filter((o) => String(o.product_id) === detailProduct.productId)
                      .sort(
                        (a, b) =>
                          new Date(b.created_at ?? 0).getTime() -
                          new Date(a.created_at ?? 0).getTime()
                      )
                      .slice(0, 5)
                      .map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between rounded border border-zinc-800/60 bg-zinc-900/80 px-2 py-1"
                        >
                          <span className="text-[11px] text-zinc-400">
                            {o.created_at
                              ? new Date(o.created_at).toLocaleString("ja-JP", {
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </span>
                          <span className="text-[11px]">
                            ¥{Number(o.amount ?? 0).toLocaleString()}
                          </span>
                          <span className="text-[11px] capitalize text-zinc-400">
                            {o.status}
                          </span>
                        </div>
                      ))}
                    {orders.filter(
                      (o) => String(o.product_id) === detailProduct.productId
                    ).length === 0 && (
                      <p className="text-[11px] text-zinc-500">
                        この商品に紐づく注文データがまだありません。
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* データが取れなかった場合のフォールバック */}
            {(detailMode === "creator" && !detailCreator) ||
            (detailMode === "product" && !detailProduct) ? (
              <p className="text-xs text-zinc-400">
                対象の集計データを取得できませんでした。注文データが存在しない可能性があります。
              </p>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}

type QualityKpiCardProps = {
  label: string;
  value: string;
  description: string;
  isWarning?: boolean;
};

/**
 * 売上品質指標用 KPI カード
 */
function QualityKpiCard({
  label,
  value,
  description,
  isWarning = false,
}: QualityKpiCardProps) {
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


