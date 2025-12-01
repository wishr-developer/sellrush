"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";

type CreatorStat = {
  id: string;
  orders: number;
  gmv: number;
  lastOrderedAt?: string | null;
  firstOrderedAt?: string | null;
  avgOrderValue: number;
  gmvShare: number;
  daysActive: number;
  flags: string[];
  isNew: boolean;
};

type CreatorScatterPoint = {
  creatorId: string;
  daysActive: number;
  orderCount: number;
};

/**
 * Admin Users（Creator 活動状況）画面
 * - creators / profiles テーブルが存在しなくても、orders から集約して表示だけ行う。
 */
export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const focusCreatorId = searchParams.get("focus_creator");
  const firstFocusRef = useRef<HTMLTableRowElement | null>(null);
  const hasScrolledRef = useRef(false);

  const [creators, setCreators] = useState<CreatorStat[]>([]);
  const [previousCreators, setPreviousCreators] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const now = new Date();
        // 期間: 過去30日
        const from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
        // 前期間: その前の30日
        const previousFrom = new Date(from.getTime() - 30 * 24 * 60 * 60 * 1000);
        const previousTo = from;

        const [currentRes, previousRes] = await Promise.all([
          supabase
            .from("orders")
            .select("creator_id, amount, status, created_at")
            .eq("status", "completed")
            .gte("created_at", from.toISOString())
            .limit(5000),
          supabase
            .from("orders")
            .select("creator_id")
            .eq("status", "completed")
            .gte("created_at", previousFrom.toISOString())
            .lt("created_at", previousTo.toISOString())
            .limit(5000),
        ]);

        if (currentRes.error || previousRes.error) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Admin Users: orders 取得エラー", {
              current: currentRes.error,
              previous: previousRes.error,
            });
          }
          if (!cancelled) {
            setError("データ取得に失敗しました。");
            setCreators([]);
            setPreviousCreators(new Set());
          }
          return;
        }

        // 前期間の Creator ID セットを作成
        const previousCreatorSet = new Set<string>();
        (previousRes.data ?? []).forEach((row) => {
          const creatorId = (row.creator_id as string | null) ?? null;
          if (creatorId) {
            previousCreatorSet.add(creatorId);
          }
        });

        // 今期の Creator 統計を集計
        const map = new Map<string, CreatorStat>();
        (currentRes.data ?? []).forEach((row) => {
          const creatorId = (row.creator_id as string | null) ?? null;
          if (!creatorId) return;
          const amount = (row.amount as number | null) ?? 0;
          const createdAt = row.created_at as string | null;
          if (!createdAt) return;

          const current =
            map.get(creatorId) ?? {
              id: creatorId,
              orders: 0,
              gmv: 0,
              lastOrderedAt: null,
              firstOrderedAt: null,
              avgOrderValue: 0,
              gmvShare: 0,
              daysActive: 0,
              flags: [],
              isNew: false,
            };
          current.orders += 1;
          current.gmv += amount;
          const createdAtTime = new Date(createdAt).getTime();
          if (
            !current.lastOrderedAt ||
            createdAtTime > new Date(current.lastOrderedAt).getTime()
          ) {
            current.lastOrderedAt = createdAt;
          }
          if (
            !current.firstOrderedAt ||
            createdAtTime < new Date(current.firstOrderedAt).getTime()
          ) {
            current.firstOrderedAt = createdAt;
          }
          map.set(creatorId, current);
        });

        if (!cancelled) {
          setPreviousCreators(previousCreatorSet);
          // 後で gmvShare と flags を計算するため、一旦ここで設定
          const list = Array.from(map.values());
          setCreators(list);
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin Users: fetch exception", e);
        }
        if (!cancelled) {
          setError("データ取得中にエラーが発生しました。");
          setCreators([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  const {
    kpi,
    topCreatorsChart,
    scatterData,
    creatorsWithStats,
    summaryMessage,
  } = useMemo(() => {
    if (creators.length === 0) {
      return {
        kpi: {
          activeCreators: 0,
          topCreatorGmvShare: 0,
          medianCreatorGmv: 0,
          newCreators: 0,
          returningCreators: 0,
          concentrationIndex: 0,
        },
        topCreatorsChart: [],
        scatterData: [],
        creatorsWithStats: [],
        summaryMessage: "データがありません。",
      };
    }

    const totalGmv = creators.reduce((sum, c) => sum + c.gmv, 0);
    const activeCreators = creators.length;

    // Creator ごとの詳細統計を計算
    const creatorsWithStatsArr: CreatorStat[] = creators.map((c) => {
      const avgOrderValue = c.orders > 0 ? c.gmv / c.orders : 0;
      const gmvShare = totalGmv > 0 ? (c.gmv / totalGmv) * 100 : 0;

      // days_active 計算
      const daysActive =
        c.firstOrderedAt && c.lastOrderedAt
          ? Math.ceil(
              (new Date(c.lastOrderedAt).getTime() -
                new Date(c.firstOrderedAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;

      // isNew 判定
      const isNew = !previousCreators.has(c.id);

      // フラグ判定
      const flags: string[] = [];
      if (gmvShare > 40) {
        flags.push("依存度高");
      }
      if (c.orders < 3 && c.gmv < 10000) {
        flags.push("不活性");
      }
      if (daysActive < 3 && c.gmv >= 50000) {
        flags.push("単発大型取引");
      }

      return {
        ...c,
        avgOrderValue,
        gmvShare,
        daysActive,
        isNew,
        flags,
      };
    });

    // Top Creator GMV Share
    const sortedByGmv = [...creatorsWithStatsArr].sort(
      (a, b) => b.gmv - a.gmv
    );
    const topCreatorGmvShare =
      sortedByGmv.length > 0 ? sortedByGmv[0].gmvShare : 0;

    // Median Creator GMV
    const gmvValues = creatorsWithStatsArr
      .filter((c) => c.gmv > 0)
      .map((c) => c.gmv)
      .sort((a, b) => a - b);
    const medianCreatorGmv =
      gmvValues.length > 0
        ? gmvValues.length % 2 === 0
          ? (gmvValues[gmvValues.length / 2 - 1] +
              gmvValues[gmvValues.length / 2]) /
            2
          : gmvValues[Math.floor(gmvValues.length / 2)]
        : 0;

    // New vs Returning Creators
    const newCreators = creatorsWithStatsArr.filter((c) => c.isNew).length;
    const returningCreators = creatorsWithStatsArr.filter((c) => !c.isNew).length;

    // Creator Concentration Index（上位3 Creator の GMV 合計 / 全体 GMV）
    const top3Gmv = sortedByGmv
      .slice(0, 3)
      .reduce((sum, c) => sum + c.gmv, 0);
    const concentrationIndex =
      totalGmv > 0 ? (top3Gmv / totalGmv) * 100 : 0;

    // 上位10 Creator（Horizontal BarChart用）
    const topCreatorsChartData = sortedByGmv.slice(0, 10).map((c) => ({
      id: c.id.length > 12 ? `${c.id.slice(0, 8)}…` : c.id,
      gmv: c.gmv,
      orders: c.orders,
      share: c.gmvShare,
    }));

    // ScatterChart 用データ
    const scatterDataArr: CreatorScatterPoint[] = creatorsWithStatsArr.map(
      (c) => ({
        creatorId: c.id,
        daysActive: c.daysActive,
        orderCount: c.orders,
      })
    );

    // 経営者向け一文サマリ生成
    let summaryMessage = "";
    if (topCreatorGmvShare >= 70) {
      summaryMessage = `⚠️ 売上の${topCreatorGmvShare.toFixed(1)}%が特定 Creator に集中しています。依存リスクが高い状態です。`;
    } else if (concentrationIndex >= 80) {
      summaryMessage = `⚠️ 上位3人の Creator で売上の${concentrationIndex.toFixed(1)}%を占めています。`;
    } else if (newCreators < returningCreators * 0.3) {
      summaryMessage = `新規 Creator より、既存 Creator からの売上比率が高い状態です。`;
    } else {
      summaryMessage = "✓ Creator ポートフォリオは全体として分散しており、健全です。";
    }

    return {
      kpi: {
        activeCreators,
        topCreatorGmvShare,
        medianCreatorGmv,
        newCreators,
        returningCreators,
        concentrationIndex,
      },
      topCreatorsChart: topCreatorsChartData,
      scatterData: scatterDataArr,
      creatorsWithStats: creatorsWithStatsArr.sort((a, b) => b.gmv - a.gmv),
      summaryMessage,
    };
  }, [creators, previousCreators]);

  // フォーカス行への自動スクロール
  useEffect(() => {
    if (!focusCreatorId || hasScrolledRef.current) return;
    if (firstFocusRef.current) {
      firstFocusRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      hasScrolledRef.current = true;
    }
  }, [focusCreatorId, creatorsWithStats]);

  return (
    <main className="min-h-screen bg-transparent text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-wide">
            クリエイター健全性分析
          </h1>
          <p className="text-sm text-zinc-400">
            クリエイター / インフルエンサーの健全性と依存リスクを見る経営画面
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

        {/* 最上段KPI（クリエイター健全性指標） */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <CreatorKpiCard
            label="Active Creators"
            value={`${kpi.activeCreators.toLocaleString()} 名`}
            description="期間内に1件以上の completed order がある Creator 数"
          />
          <CreatorKpiCard
            label="Top Creator GMV Share"
            value={`${kpi.topCreatorGmvShare.toFixed(1)}%`}
            description="上位1 Creator の GMV が全体 GMV に占める割合"
            isWarning={kpi.topCreatorGmvShare > 50}
            isCritical={kpi.topCreatorGmvShare > 70}
          />
          <CreatorKpiCard
            label="Median Creator GMV"
            value={`¥${Math.round(kpi.medianCreatorGmv).toLocaleString()}`}
            description="Creator ごとの GMV の中央値"
          />
          <CreatorKpiCard
            label="New Creators"
            value={`${kpi.newCreators} 名`}
            description="初めて売上が立った Creator の人数"
          />
          <CreatorKpiCard
            label="Returning Creators"
            value={`${kpi.returningCreators} 名`}
            description="過去にも売上があった Returning Creator の人数"
          />
        </section>

        {/* Creator Concentration Index（追加KPI） */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CreatorKpiCard
            label="Creator Concentration Index"
            value={`${kpi.concentrationIndex.toFixed(1)}%`}
            description="上位3 Creator の GMV 合計 / 全体 GMV（%）"
            isWarning={kpi.concentrationIndex > 80}
          />
        </section>

        {/* クリエイター別売上構造チャート（Horizontal BarChart） */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <p className="mb-2 text-xs font-semibold text-zinc-300">
            クリエイター別売上構造（上位10 Creator）
          </p>
          <p className="mb-3 text-[11px] text-zinc-500">
            誰に依存しているのかが一目で分かります。右端に全体GMV比を表示。
          </p>
          <div className="h-80">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                読み込み中…
              </div>
            ) : topCreatorsChart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                データがありません。
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topCreatorsChart}
                  layout="vertical"
                  margin={{ left: 100, right: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.2)"
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    tickFormatter={(v) => `¥${Math.round(v / 1000)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="id"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,0.4)",
                      fontSize: 11,
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      if (name === "gmv") {
                        return [
                          `¥${value.toLocaleString()} (${props.payload.share.toFixed(1)}%)`,
                          "GMV",
                        ];
                      }
                      return [`${value} 件`, "注文件数"];
                    }}
                  />
                  <Bar dataKey="gmv" radius={4}>
                    {topCreatorsChart.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.share > 40
                            ? "#ef4444"
                            : entry.share > 20
                            ? "#f59e0b"
                            : "#38bdf8"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* 継続性・安定度の可視化（ScatterChart） */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <p className="mb-2 text-xs font-semibold text-zinc-300">
            継続性・安定度の可視化
          </p>
          <p className="mb-3 text-[11px] text-zinc-500">
            X: 活動継続日数、Y: 注文件数。左下: 単発・お試し系、右上: 継続・主力プレイヤー。
          </p>
          <div className="h-80">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                読み込み中…
              </div>
            ) : scatterData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                データがありません。
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.2)"
                  />
                  <XAxis
                    type="number"
                    dataKey="daysActive"
                    name="活動継続日数"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    label={{
                      value: "活動継続日数",
                      position: "insideBottom",
                      offset: -5,
                      style: { fill: "#71717a", fontSize: 10 },
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="orderCount"
                    name="注文件数"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    label={{
                      value: "注文件数",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "#71717a", fontSize: 10 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,0.4)",
                      fontSize: 11,
                    }}
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(value: number, name: string, props: any) => {
                      if (name === "daysActive") {
                        return [`${value} 日`, "活動継続日数"];
                      }
                      if (name === "orderCount") {
                        return [`${value} 件`, "注文件数"];
                      }
                      return [value, name];
                    }}
                    labelFormatter={() => {
                      return "Creator 情報";
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload as CreatorScatterPoint;
                        return (
                          <div className="bg-[#020617] border border-zinc-600 rounded p-2 text-[11px]">
                            <p className="text-zinc-300 mb-1">
                              Creator ID:{" "}
                              {data.creatorId.length > 12
                                ? `${data.creatorId.slice(0, 8)}…`
                                : data.creatorId}
                            </p>
                            <p className="text-zinc-400">
                              活動継続日数: {data.daysActive} 日
                            </p>
                            <p className="text-zinc-400">
                              注文件数: {data.orderCount} 件
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter
                    name="Creator"
                    data={scatterData}
                    fill="#38bdf8"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* テーブル（クリエイター一覧 + フラグ） */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-300">
              クリエイター一覧（判断補助）
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
                  <th className="px-2 py-2 text-left font-normal">Creator ID</th>
                  <th className="px-2 py-2 text-right font-normal">Orders</th>
                  <th className="px-2 py-2 text-right font-normal">GMV</th>
                  <th className="px-2 py-2 text-right font-normal">Average Order Value</th>
                  <th className="px-2 py-2 text-left font-normal">Last Order At</th>
                  <th className="px-2 py-2 text-right font-normal">GMV Share (%)</th>
                  <th className="px-2 py-2 text-left font-normal">Flags</th>
                </tr>
              </thead>
              <tbody>
                {creatorsWithStats.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-2 py-6 text-center text-zinc-500"
                    >
                      データがありません。
                    </td>
                  </tr>
                ) : (
                  creatorsWithStats.map((c, index) => {
                    const isFocused = focusCreatorId && c.id === focusCreatorId;
                    const isFirstFocused =
                      isFocused &&
                      creatorsWithStats.findIndex(
                        (creator) => creator.id === focusCreatorId
                      ) === index;
                    return (
                    <tr
                      key={c.id}
                      ref={
                        isFirstFocused && !firstFocusRef.current
                          ? (el) => {
                              if (el) firstFocusRef.current = el;
                            }
                          : undefined
                      }
                      className={`border-t border-zinc-800/80 text-[11px] hover:bg-zinc-900/70 ${
                        c.flags.length > 0 ? "text-amber-300" : ""
                      } ${
                        isFocused
                          ? "border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]"
                          : ""
                      }`}
                    >
                      <td className="px-2 py-2">
                        {c.id.length > 12 ? `${c.id.slice(0, 8)}…` : c.id}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {c.orders.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right">
                        ¥{c.gmv.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {c.orders > 0
                          ? `¥${Math.round(c.avgOrderValue).toLocaleString()}`
                          : "-"}
                      </td>
                      <td className="px-2 py-2">
                        {c.lastOrderedAt
                          ? new Date(c.lastOrderedAt).toLocaleDateString("ja-JP")
                          : "-"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {c.gmvShare.toFixed(1)}%
                      </td>
                      <td className="px-2 py-2">
                        {c.flags.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <span>⚠️</span>
                            <span className="text-[10px]">
                              {c.flags.join(", ")}
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
    </main>
  );
}

type CreatorKpiCardProps = {
  label: string;
  value: string;
  description: string;
  isWarning?: boolean;
  isCritical?: boolean;
};

function CreatorKpiCard({
  label,
  value,
  description,
  isWarning = false,
  isCritical = false,
}: CreatorKpiCardProps) {
  return (
    <div
      className={`rounded-2xl border ${
        isCritical
          ? "border-red-500/30 bg-red-950/20"
          : isWarning
          ? "border-amber-500/30 bg-amber-950/20"
          : "border-white/10 bg-zinc-950/80"
      } px-4 py-3`}
    >
      <p className="text-xs text-zinc-400">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          isCritical
            ? "text-red-300"
            : isWarning
            ? "text-amber-300"
            : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">{description}</p>
    </div>
  );
}


