"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { showErrorToast } from "@/components/ui/Toast";
import { DashboardSkeleton } from "@/components/ui/LoadingSkeleton";
import type { User, BrandKPIData, BrandPayoutData, ProductPerformance } from "@/types/dashboard";
// recharts は既に dependency に入っている前提
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type OrderPoint = {
  date: string;
  gmv: number;
  orders: number;
};

type ProductStats = {
  id: string;
  name: string;
  gmv: number;
  orders: number;
};

export default function BrandDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [seriesData, setSeriesData] = useState<OrderPoint[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
  const [kpiData, setKpiData] = useState<BrandKPIData>({
    totalGmv: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    activeProducts: 0,
  });
  const [payoutData, setPayoutData] = useState<BrandPayoutData>({
    totalBrandAmount: 0,
    pendingBrandAmount: 0,
    paidBrandAmount: 0,
    pendingCount: 0,
    paidCount: 0,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/brand");
        return;
      }

      const userRole = user.user_metadata?.role;
      if (userRole !== "brand" && userRole !== "company") {
        router.push("/");
        return;
      }

      setUser(user);
      await fetchDashboardData(user.id);
    } catch (error) {
      console.error("Auth check error:", error);
      router.push("/login?redirect=/brand");
    }
  };

  const fetchDashboardData = async (userId: string) => {
    try {
      setIsLoading(true);

      // 1. 自社商品IDを取得
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id")
        .eq("owner_id", userId);

      if (productsError) {
        console.error("Products fetch error:", productsError);
        const errorMessage = "商品データの取得に失敗しました";
        setError(errorMessage);
        showErrorToast(errorMessage);
        setIsLoading(false);
        return;
      }

      if (!products || products.length === 0) {
        setIsLoading(false);
        return;
      }

      const productIds = products.map((p) => p.id);

      // 2. 直近30日の注文を取得（グラフ用）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      // 直近7日の注文を取得（KPI用）
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, amount, created_at, product_id")
        .in("product_id", productIds)
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (ordersError) {
        console.error("Orders fetch error:", ordersError);
        const errorMessage = "注文データの取得に失敗しました";
        setError(errorMessage);
        showErrorToast(errorMessage);
        setIsLoading(false);
        return;
      }

      // 3. 日別に集計（直近30日）
      const dailyData: Record<string, { gmv: number; orders: number }> = {};
      const today = new Date();

      // 直近30日の日付を初期化
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString("ja-JP", {
          month: "2-digit",
          day: "2-digit",
        });
        dailyData[dateStr] = { gmv: 0, orders: 0 };
      }
      
      // 直近7日の注文をフィルタ（KPI用）
      const recent7DaysOrders = orders?.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= sevenDaysAgo;
      }) || [];

      // 注文データを集計
      orders?.forEach((order) => {
        const orderDate = new Date(order.created_at);
        const dateStr = orderDate.toLocaleDateString("ja-JP", {
          month: "2-digit",
          day: "2-digit",
        });
        if (dailyData[dateStr]) {
          dailyData[dateStr].gmv += order.amount || 0;
          dailyData[dateStr].orders += 1;
        }
      });

      // グラフ用データに変換
      const series: OrderPoint[] = Object.entries(dailyData).map(([date, data]) => ({
        date,
        gmv: data.gmv,
        orders: data.orders,
      }));

      setSeriesData(series);

      // 4. KPI計算（直近7日）
      const totalGmv = recent7DaysOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
      const totalOrders = recent7DaysOrders.length;
      const avgOrderValue = totalOrders === 0 ? 0 : Math.round(totalGmv / totalOrders);

      setKpiData({
        totalGmv,
        totalOrders,
        avgOrderValue,
        activeProducts: products.length,
      });

      // 5. 商品別売上集計（直近30日）
      const thirtyDaysAgoDate = new Date();
      thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);

      const { data: productOrders } = await supabase
        .from("orders")
        .select("product_id, amount")
        .in("product_id", productIds)
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgoDate.toISOString());

      // 商品ごとに集計
      const productStatsMap = new Map<string, { name: string; gmv: number; orders: number }>();

      // 商品名を取得
      const { data: productNames } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);

      productNames?.forEach((p) => {
        productStatsMap.set(p.id, { name: p.name, gmv: 0, orders: 0 });
      });

      productOrders?.forEach((order) => {
        const stats = productStatsMap.get(order.product_id);
        if (stats) {
          stats.gmv += order.amount || 0;
          stats.orders += 1;
        }
      });

      // 売上順にソートしてTOP5を取得
      const topProductsList: ProductStats[] = Array.from(productStatsMap.entries())
        .map(([id, stats]) => ({
          id,
          name: stats.name,
          gmv: stats.gmv,
          orders: stats.orders,
        }))
        .filter((p) => p.gmv > 0)
        .sort((a, b) => b.gmv - a.gmv)
        .slice(0, 5);

      setTopProducts(topProductsList);

      // 6. ブランド取り分の報酬データを取得
      const { data: payouts, error: payoutsError } = await supabase
        .from("payouts")
        .select("brand_amount, status")
        .eq("brand_id", userId);

      if (!payoutsError && payouts) {
        const pending = payouts.filter((p) => p.status === "pending");
        const paid = payouts.filter((p) => p.status === "paid");

        const totalBrandAmount = payouts.reduce((sum, p) => sum + (p.brand_amount || 0), 0);
        const pendingBrandAmount = pending.reduce((sum, p) => sum + (p.brand_amount || 0), 0);
        const paidBrandAmount = paid.reduce((sum, p) => sum + (p.brand_amount || 0), 0);

        setPayoutData({
          totalBrandAmount,
          pendingBrandAmount,
          paidBrandAmount,
          pendingCount: pending.length,
          paidCount: paid.length,
        });
      }

      setError(null);
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      setError("ダッシュボードデータの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const totalGmv = kpiData.totalGmv;
  const totalOrders = kpiData.totalOrders;
  const avgOrderValue = kpiData.avgOrderValue;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            BRAND DASHBOARD
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-50">
            ブランド別ダッシュボード
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            自社商品の売上・パフォーマンスをひと目で確認できます。
          </p>
        </div>
      </header>

      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              if (user) {
                fetchDashboardData(user.id);
              }
            }}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
          >
            再試行
          </button>
        </div>
      ) : (
        <>
      {/* KPI row */}
          <section className="grid gap-3 md:grid-cols-4 mb-6">
        <KpiCard
          label="直近7日のGMV"
          value={`¥${totalGmv.toLocaleString()}`}
              caption="完了済み注文の売上合計"
        />
        <KpiCard
          label="直近7日の注文数"
          value={`${totalOrders} 件`}
              caption="完了済み注文のみカウント"
        />
        <KpiCard
          label="平均注文単価"
          value={
            avgOrderValue === 0 ? "-" : `¥${avgOrderValue.toLocaleString()}`
          }
          caption="GMV ÷ 注文件数"
        />
        <KpiCard
              label="登録商品数"
              value={`${kpiData.activeProducts} 商品`}
              caption="現在登録中の商品数"
        />
      </section>

          {/* ブランド取り分の報酬サマリー */}
          <section className="grid gap-3 md:grid-cols-3 mb-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400 mb-1">ブランド取り分（合計）</p>
              <p className="text-xl font-semibold text-slate-100">
                ¥{payoutData.totalBrandAmount.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                全期間の累計
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs text-slate-400 mb-1">支払い済み</p>
              <p className="text-xl font-semibold text-emerald-400">
                ¥{payoutData.paidBrandAmount.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {payoutData.paidCount}件の支払い済み
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs text-slate-400 mb-1">支払い待ち</p>
              <p className="text-xl font-semibold text-amber-400">
                ¥{payoutData.pendingBrandAmount.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {payoutData.pendingCount}件の処理待ち
              </p>
            </div>
      </section>

      {/* Chart + Top products */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                売上トレンド
              </p>
              <p className="text-xs text-slate-500">
                直近30日間の GMV / 注文件数
              </p>
            </div>
          </div>
          <div className="mt-3 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seriesData}>
                <defs>
                  <linearGradient id="brandGmv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    borderColor: "#1e293b",
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                  formatter={(value: number | string, key: string) => {
                    if (key === "gmv")
                      return [`¥${Number(value).toLocaleString()}`, "GMV"];
                    if (key === "orders") return [`${value}件`, "Orders"];
                    return [value, key];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="gmv"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#brandGmv)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Top Products
              </p>
              <p className="text-xs text-slate-500">
                売上順の上位商品（直近30日）
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {topProducts.length > 0 ? (
              topProducts.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/70 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium text-slate-100">
                    {idx + 1}. {p.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    GMV: ¥{p.gmv.toLocaleString()} / {p.orders} 件
                  </p>
                </div>
              </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">
                直近30日で売上のある商品がありません
              </p>
            )}
          </div>
        </div>
      </section>
        </>
      )}
    </div>
  );
}

function KpiCard(props: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <p className="text-[11px] text-slate-500">{props.label}</p>
      <p className="mt-1 text-base font-semibold text-slate-50">
        {props.value}
      </p>
      {props.caption && (
        <p className="mt-1 text-[11px] text-slate-500">{props.caption}</p>
      )}
    </div>
  );
}

