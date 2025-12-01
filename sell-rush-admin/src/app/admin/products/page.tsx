"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";

type ProductRow = {
  id: string;
  name?: string | null;
  price?: number | null;
  brand_id?: string | null;
  company_name?: string | null;
};

type ProductStats = {
  orders: number;
  gmv: number;
  lastOrderedAt?: string | null;
  avgOrderValue: number;
  gmvShare: number;
  flags: string[];
};

type ProductWithStats = ProductRow & ProductStats;

type GmvBucket = {
  range: string;
  count: number;
};

/**
 * Admin 商品別パフォーマンス画面（読み取り専用）
 */
export default function AdminProductsPage() {
  const searchParams = useSearchParams();
  const focusProductId = searchParams.get("focus_product");
  const firstFocusRef = useRef<HTMLTableRowElement | null>(null);
  const hasScrolledRef = useRef(false);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stats, setStats] = useState<Record<string, ProductStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [productsRes, ordersRes] = await Promise.all([
          supabase
            .from("products")
            .select("id, name, price, brand_id, company_name")
            .limit(500),
          supabase
            .from("orders")
            .select("product_id, amount, status, created_at")
            .eq("status", "completed")
            .limit(5000),
        ]);

        // エラーが実際に存在するか確認（null/undefined でなく、message または code が存在する場合のみ）
        const hasProductsError =
          productsRes.error &&
          productsRes.error !== null &&
          typeof productsRes.error === "object" &&
          (productsRes.error.message || productsRes.error.code);
        const hasOrdersError =
          ordersRes.error &&
          ordersRes.error !== null &&
          typeof ordersRes.error === "object" &&
          (ordersRes.error.message || ordersRes.error.code);

        if (hasProductsError || hasOrdersError) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            if (hasProductsError) {
              console.error("Admin Products: products 取得エラー", productsRes.error);
            }
            if (hasOrdersError) {
              console.error("Admin Products: orders 取得エラー", ordersRes.error);
            }
          }
          if (!cancelled) {
            setError("データ取得に失敗しました。");
            setProducts([]);
            setStats({});
          }
          return;
        }

        if (!cancelled) {
          const productRows =
            (productsRes.data as ProductRow[] | null) ?? [];
          setProducts(productRows);

          const statMap: Record<string, ProductStats> = {};
          (ordersRes.data ?? []).forEach((row) => {
            const productId = (row.product_id as string | null) ?? null;
            if (!productId) return;
            const amount = (row.amount as number | null) ?? 0;
            const createdAt = row.created_at as string | null;
            const current = statMap[productId] ?? {
              orders: 0,
              gmv: 0,
              lastOrderedAt: null,
            };
            current.orders += 1;
            current.gmv += amount;
            if (
              createdAt &&
              (!current.lastOrderedAt ||
                new Date(createdAt).getTime() >
                  new Date(current.lastOrderedAt).getTime())
            ) {
              current.lastOrderedAt = createdAt;
            }
            statMap[productId] = current;
          });
          setStats(statMap);
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin Products: fetch exception", e);
        }
        if (!cancelled) {
          setError("データ取得中にエラーが発生しました。");
          setProducts([]);
          setStats({});
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
    topProductsChart,
    gmvBuckets,
    productsWithStats,
    summaryMessage,
  } = useMemo(() => {
    let totalGmv = 0;
    let totalOrders = 0;

    // 全商品の統計を集計
    Object.values(stats).forEach((s) => {
      totalGmv += s.gmv;
      totalOrders += s.orders;
    });

    // 商品ごとの詳細統計を計算
    const productsWithStatsArr: ProductWithStats[] = products.map((p) => {
      const s = stats[p.id] ?? {
        orders: 0,
        gmv: 0,
        lastOrderedAt: null,
      };
      const avgOrderValue =
        s.orders > 0 ? s.gmv / s.orders : 0;
      const gmvShare = totalGmv > 0 ? (s.gmv / totalGmv) * 100 : 0;

      // フラグ判定
      const flags: string[] = [];
      if (gmvShare > 50) {
        flags.push("依存度高");
      }
      // 掲載日数の判定（products テーブルに created_at があれば使用、なければ lastOrderedAt から推定）
      const daysSinceLastOrder = s.lastOrderedAt
        ? (new Date().getTime() - new Date(s.lastOrderedAt).getTime()) /
          (1000 * 60 * 60 * 24)
        : null;
      if (s.orders < 3 && daysSinceLastOrder !== null && daysSinceLastOrder > 30) {
        flags.push("不発商品");
      }

      return {
        ...p,
        orders: s.orders,
        gmv: s.gmv,
        lastOrderedAt: s.lastOrderedAt,
        avgOrderValue,
        gmvShare,
        flags,
      };
    });

    // Active Products（期間内に売上が1件以上ある商品数）
    const activeProducts = productsWithStatsArr.filter((p) => p.orders > 0).length;

    // Top Product GMV Share
    const sortedByGmv = [...productsWithStatsArr]
      .sort((a, b) => b.gmv - a.gmv);
    const topProductGmvShare =
      sortedByGmv.length > 0 ? sortedByGmv[0].gmvShare : 0;

    // Median Product GMV
    const gmvValues = productsWithStatsArr
      .filter((p) => p.gmv > 0)
      .map((p) => p.gmv)
      .sort((a, b) => a - b);
    const medianGmv =
      gmvValues.length > 0
        ? gmvValues.length % 2 === 0
          ? (gmvValues[gmvValues.length / 2 - 1] +
              gmvValues[gmvValues.length / 2]) /
            2
          : gmvValues[Math.floor(gmvValues.length / 2)]
        : 0;

    // 上位10商品（Horizontal BarChart用）
    const topProductsChartData = sortedByGmv.slice(0, 10).map((p) => ({
      name: p.name ?? p.id,
      gmv: p.gmv,
      share: p.gmvShare,
    }));

    // GMV分布バケット
    const buckets: GmvBucket[] = [
      { range: "0〜1万", count: 0 },
      { range: "1万〜5万", count: 0 },
      { range: "5万〜10万", count: 0 },
      { range: "10万以上", count: 0 },
    ];
    productsWithStatsArr.forEach((p) => {
      if (p.gmv < 10000) {
        buckets[0].count += 1;
      } else if (p.gmv < 50000) {
        buckets[1].count += 1;
      } else if (p.gmv < 100000) {
        buckets[2].count += 1;
      } else {
        buckets[3].count += 1;
      }
    });

    // 経営者向けサマリ生成
    let summaryMessage = "";
    if (productsWithStatsArr.length === 0) {
      summaryMessage = "データがありません。";
    } else if (topProductGmvShare > 70) {
      summaryMessage = `⚠️ 売上の${topProductGmvShare.toFixed(1)}%が上位1商品に集中しています。リスク分散が必要です。`;
    } else if (topProductGmvShare > 50) {
      summaryMessage = `売上の${topProductGmvShare.toFixed(1)}%が上位1商品に集中しています。`;
    } else {
      summaryMessage = "✓ 全体として商品分散は健全です。";
    }

    // 直近30日で売上が立っていない商品
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const inactiveProducts = productsWithStatsArr.filter((p) => {
      if (!p.lastOrderedAt) return true;
      return new Date(p.lastOrderedAt).getTime() < thirtyDaysAgo.getTime();
    });
    if (inactiveProducts.length > 0 && summaryMessage.includes("健全です")) {
      summaryMessage += ` ただし、直近30日で売上が立っていない商品が${inactiveProducts.length}件あります。`;
    }

    return {
      kpi: {
        totalGmv,
        totalOrders,
        activeProducts,
        topProductGmvShare,
        medianGmv,
      },
      topProductsChart: topProductsChartData,
      gmvBuckets: buckets,
      productsWithStats: productsWithStatsArr.sort((a, b) => b.gmv - a.gmv),
      summaryMessage,
    };
  }, [products, stats]);

  // フォーカス行への自動スクロール
  useEffect(() => {
    if (!focusProductId || hasScrolledRef.current) return;
    if (firstFocusRef.current) {
      firstFocusRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      hasScrolledRef.current = true;
    }
  }, [focusProductId, productsWithStats]);

  return (
    <main className="min-h-screen bg-transparent text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-wide">
            商品ポートフォリオ分析
          </h1>
          <p className="text-sm text-zinc-400">
            商品ポートフォリオの健全性を判断する経営画面
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

        {/* 最上段KPI（売上集中リスク指標） */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <PortfolioKpiCard
            label="Total GMV"
            value={`¥${kpi.totalGmv.toLocaleString()}`}
            description="全商品の売上合計"
          />
          <PortfolioKpiCard
            label="Total Orders"
            value={`${kpi.totalOrders.toLocaleString()} 件`}
            description="全商品の注文件数"
          />
          <PortfolioKpiCard
            label="Active Products"
            value={`${kpi.activeProducts} 件`}
            description="期間内に売上が1件以上ある商品数"
          />
          <PortfolioKpiCard
            label="Top Product GMV Share"
            value={`${kpi.topProductGmvShare.toFixed(1)}%`}
            description="上位1商品が全GMVに占める割合"
            isWarning={kpi.topProductGmvShare > 50}
            isCritical={kpi.topProductGmvShare > 70}
          />
          <PortfolioKpiCard
            label="Median Product GMV"
            value={`¥${Math.round(kpi.medianGmv).toLocaleString()}`}
            description="商品GMVの中央値（平均に騙されない指標）"
          />
        </section>

        {/* 商品別売上構造チャート（Horizontal BarChart） */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <p className="mb-2 text-xs font-semibold text-zinc-300">
            商品別売上構造（上位10商品）
          </p>
          <p className="mb-3 text-[11px] text-zinc-500">
            どの商品に売上が偏っているかが一目で分かります。右端に全体GMV比を表示。
          </p>
          <div className="h-80">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                読み込み中…
              </div>
            ) : topProductsChart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                データがありません。
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProductsChart}
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
                    dataKey="name"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,0.4)",
                      fontSize: 11,
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `¥${value.toLocaleString()} (${props.payload.share.toFixed(1)}%)`,
                      "GMV",
                    ]}
                  />
                  <Bar dataKey="gmv" radius={4}>
                    {topProductsChart.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.share > 50
                            ? "#ef4444"
                            : entry.share > 30
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

        {/* ロングテール可視化（GMV分布） */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <p className="mb-2 text-xs font-semibold text-zinc-300">
            Product GMV 分布（ロングテール可視化）
          </p>
          <p className="mb-3 text-[11px] text-zinc-500">
            新商品育成・SKU戦略判断用。商品の売上分布を可視化します。
          </p>
          <div className="h-60">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                読み込み中…
              </div>
            ) : gmvBuckets.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                データがありません。
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gmvBuckets}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.2)"
                  />
                  <XAxis
                    dataKey="range"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,0.4)",
                      fontSize: 11,
                    }}
                    formatter={(value: number) => [`${value} 商品`, "件数"]}
                  />
                  <Bar dataKey="count" fill="#a855f7" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* 商品一覧テーブル（判断補助） */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-300">
              商品一覧（判断補助）
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
                  <th className="px-2 py-2 text-left font-normal">Product Name</th>
                  <th className="px-2 py-2 text-right font-normal">Orders</th>
                  <th className="px-2 py-2 text-right font-normal">GMV</th>
                  <th className="px-2 py-2 text-right font-normal">Average Order Value</th>
                  <th className="px-2 py-2 text-right font-normal">GMV Share (%)</th>
                  <th className="px-2 py-2 text-left font-normal">Last Sold At</th>
                  <th className="px-2 py-2 text-left font-normal">フラグ</th>
                </tr>
              </thead>
              <tbody>
                {productsWithStats.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-2 py-6 text-center text-zinc-500"
                    >
                      データがありません。
                    </td>
                  </tr>
                ) : (
                  productsWithStats.map((p, index) => {
                    const isFocused = focusProductId && p.id === focusProductId;
                    const isFirstFocused =
                      isFocused &&
                      productsWithStats.findIndex(
                        (prod) => prod.id === focusProductId
                      ) === index;
                    return (
                    <tr
                      key={p.id}
                      ref={
                        isFirstFocused && !firstFocusRef.current
                          ? (el) => {
                              if (el) firstFocusRef.current = el;
                            }
                          : undefined
                      }
                      className={`border-t border-zinc-800/80 text-[11px] hover:bg-zinc-900/70 ${
                        isFocused
                          ? "border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]"
                          : ""
                      }`}
                    >
                      <td className="px-2 py-2 text-zinc-100">
                        {p.name ?? p.id}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-300">
                        {p.orders.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-100">
                        ¥{p.gmv.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-300">
                        {p.orders > 0
                          ? `¥${Math.round(p.avgOrderValue).toLocaleString()}`
                          : "-"}
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-100">
                        {p.gmvShare.toFixed(1)}%
                      </td>
                      <td className="px-2 py-2 text-zinc-400">
                        {p.lastOrderedAt
                          ? new Date(p.lastOrderedAt).toLocaleDateString("ja-JP")
                          : "-"}
                      </td>
                      <td className="px-2 py-2">
                        {p.flags.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <span>⚠️</span>
                            <span className="text-[10px]">
                              {p.flags.join(", ")}
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

type PortfolioKpiCardProps = {
  label: string;
  value: string;
  description: string;
  isWarning?: boolean;
  isCritical?: boolean;
};

function PortfolioKpiCard({
  label,
  value,
  description,
  isWarning = false,
  isCritical = false,
}: PortfolioKpiCardProps) {
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


