"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  DollarSign,
  Users,
  Package,
  LogOut,
  BarChart3,
  AlertCircle,
  TrendingDown,
  CheckCircle,
} from "lucide-react";

type KPIData = {
  totalRevenue: number;
  totalOrders: number;
  activeCreators: number;
};

type ProductPerformance = {
  product_id: string;
  product_name: string;
  revenue: number;
  order_count: number;
};

type CreatorPerformance = {
  creator_id: string;
  revenue: number;
  order_count: number;
  contribution_rate: number;
};

/**
 * Brand Dashboard Client Component
 * 企業向け管理画面 - 自社商品の売上・パフォーマンスを表示
 */
export default function BrandDashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData>({
    totalRevenue: 0,
    totalOrders: 0,
    activeCreators: 0,
  });
  const [productPerformance, setProductPerformance] = useState<
    ProductPerformance[]
  >([]);
  const [creatorPerformance, setCreatorPerformance] = useState<
    CreatorPerformance[]
  >([]);

  /**
   * ダッシュボードデータを取得
   * RLS により、自分の product に紐づく orders のみ取得可能
   */
  const fetchDashboardData = useCallback(async (brandId: string) => {
    try {
      // 1. 自分の商品IDを取得
      const { data: myProducts, error: productsError } = await supabase
        .from("products")
        .select("id, name")
        .eq("brand_id", brandId);

      if (productsError) {
        console.error("商品データの取得に失敗しました:", productsError);
        return;
      }

      if (!myProducts || myProducts.length === 0) {
        // 商品がない場合もエラーにしない
        setKpiData({
          totalRevenue: 0,
          totalOrders: 0,
          activeCreators: 0,
        });
        setProductPerformance([]);
        setCreatorPerformance([]);
        return;
      }

      const productIds = myProducts.map((p) => p.id);

      // 2. 自分の商品に紐づく orders を取得
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, product_id, creator_id, amount")
        .in("product_id", productIds);

      if (ordersError) {
        console.error("注文データの取得に失敗しました:", ordersError);
        return;
      }

      if (!orders || orders.length === 0) {
        // 注文がない場合もエラーにしない
        setKpiData({
          totalRevenue: 0,
          totalOrders: 0,
          activeCreators: 0,
        });
        setProductPerformance([]);
        setCreatorPerformance([]);
        return;
      }

      // 3. KPI を計算
      const totalRevenue = orders.reduce(
        (sum, order) => sum + (order.amount || 0),
        0
      );
      const totalOrders = orders.length;
      const activeCreators = new Set(
        orders.map((o) => o.creator_id).filter(Boolean)
      ).size;

      setKpiData({
        totalRevenue,
        totalOrders,
        activeCreators,
      });

      // 4. 商品別パフォーマンスを計算
      const productMap = new Map<string, ProductPerformance>();
      myProducts.forEach((product) => {
        productMap.set(product.id, {
          product_id: product.id,
          product_name: product.name,
          revenue: 0,
          order_count: 0,
        });
      });

      orders.forEach((order) => {
        const product = productMap.get(order.product_id);
        if (product) {
          product.revenue += order.amount || 0;
          product.order_count += 1;
        }
      });

      const productPerf = Array.from(productMap.values())
        .filter((p) => p.order_count > 0)
        .sort((a, b) => b.revenue - a.revenue);

      setProductPerformance(productPerf);

      // 5. Creator別パフォーマンスを計算
      const creatorMap = new Map<string, CreatorPerformance>();

      orders.forEach((order) => {
        if (!order.creator_id) return;

        const existing = creatorMap.get(order.creator_id);
        if (existing) {
          existing.revenue += order.amount || 0;
          existing.order_count += 1;
        } else {
          creatorMap.set(order.creator_id, {
            creator_id: order.creator_id,
            revenue: order.amount || 0,
            order_count: 1,
            contribution_rate: 0,
          });
        }
      });

      // 貢献率を計算
      const creatorPerf = Array.from(creatorMap.values())
        .map((creator) => ({
          ...creator,
          contribution_rate:
            totalRevenue > 0 ? (creator.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      setCreatorPerformance(creatorPerf);
    } catch (error) {
      console.error("ダッシュボードデータの取得エラー:", error);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // role チェック
        const userRole = user.user_metadata?.role;
        if (userRole !== "brand" && userRole !== "company") {
          // brand または company 以外はリダイレクト
          if (userRole === "creator" || userRole === "influencer") {
            router.push("/dashboard");
          } else {
            router.push("/login");
          }
          return;
        }

        setUser(user);
        await fetchDashboardData(user.id);

        // リアルタイム更新: orders テーブルの変更を監視
        const channel = supabase
          .channel("brand-orders-changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "orders",
            },
            async () => {
              // 本番環境ではログを出力しない（開発環境のみ）
              if (process.env.NODE_ENV === "development") {
                console.log("注文データが更新されました");
              }
              // データを再取得してダッシュボードを更新
              await fetchDashboardData(user.id);
            }
          )
          .subscribe();

        // クリーンアップ
        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("ユーザー認証エラー:", error);
        }
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, [router, fetchDashboardData]);


  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ヘッダー */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Brand Dashboard</h1>
            <p className="text-zinc-400 text-sm mt-1">
              自社商品の売上・パフォーマンスをリアルタイムで確認できます。
            </p>
          </div>
        </header>

        {/* ログアウトボタン */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            ログアウト
          </button>
        </div>

        {/* 判断ガイダンスバー */}
        {(() => {
          const { totalRevenue, activeCreators } = kpiData;
          const hasRevenue = totalRevenue > 0;
          const hasLowCreators = activeCreators < 3;
          const hasManyCreators = activeCreators >= 3;

          // 売上が伸びていない = アクティブCreatorが多いのに売上が低い
          // 簡易判定: Creator数 >= 3 かつ 売上が低い（例: Creator数 * 10000 未満）
          const revenuePerCreator = hasManyCreators
            ? totalRevenue / activeCreators
            : 0;
          const isRevenueStagnant =
            hasManyCreators && revenuePerCreator < 10000;

          let guidanceText = "";
          let GuidanceIcon = CheckCircle;
          let bgColor = "bg-sky-500/10";
          let borderColor = "border-sky-500/20";
          let textColor = "text-sky-200";

          if (!hasRevenue) {
            // 総売上 === 0
            guidanceText = "現在は成果が出ていません。Creator投稿を待ちましょう。";
            GuidanceIcon = AlertCircle;
            bgColor = "bg-blue-500/10";
            borderColor = "border-blue-500/20";
            textColor = "text-blue-200";
          } else if (hasRevenue && hasLowCreators) {
            // 総売上 > 0 かつ アクティブCreator < 3
            guidanceText = "好調です。Creatorを増やす余地があります。";
            GuidanceIcon = TrendingUp;
            bgColor = "bg-emerald-500/10";
            borderColor = "border-emerald-500/20";
            textColor = "text-emerald-200";
          } else if (isRevenueStagnant) {
            // アクティブCreator >= 3 かつ 売上が伸びていない
            guidanceText =
              "要確認：成果の出ていないCreatorが含まれている可能性があります。";
            GuidanceIcon = TrendingDown;
            bgColor = "bg-amber-500/10";
            borderColor = "border-amber-500/20";
            textColor = "text-amber-200";
          } else {
            // その他（好調な状態）
            guidanceText = "順調に成果が出ています。";
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

        {/* 主CTA：Creator別売上を確認する */}
        <div className="mb-6">
          <button
            onClick={() => {
              // Creator別パフォーマンスセクションまでスクロール
              const element = document.getElementById("creator-performance");
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-white text-black text-base font-semibold tracking-wide shadow-[0_18px_40px_rgba(0,0,0,0.9)] transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
          >
            <BarChart3 className="w-5 h-5" />
            Creator別売上を確認する
          </button>
        </div>

        {/* 上段: KPI カード */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-400">総売上</p>
              <p className="text-xl font-semibold">
                ¥{kpiData.totalRevenue.toLocaleString()}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                広告費なしで発生した実売上です
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-sky-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-400">注文件数</p>
              <p className="text-xl font-semibold">
                {kpiData.totalOrders.toLocaleString()} 件
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Creator経由の注文件数です
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-zinc-400">アクティブ Creator</p>
              <p className="text-xl font-semibold">
                {kpiData.activeCreators.toLocaleString()} 人
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                直近で成果が出ているCreator数です
              </p>
            </div>
          </div>
        </section>

        {/* 中段: 商品別パフォーマンス（視認性を下げる） */}
        <section className="mb-8 opacity-60">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-200">
                商品別パフォーマンス
              </h2>
            </div>

            {productPerformance.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">
                まだ売上データがありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">
                        商品名
                      </th>
                      <th className="text-right py-3 px-4 text-zinc-400 font-medium">
                        売上
                      </th>
                      <th className="text-right py-3 px-4 text-zinc-400 font-medium">
                        注文件数
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {productPerformance.map((product) => (
                      <tr
                        key={product.product_id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-4 text-zinc-100">
                          {product.product_name}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-300 font-semibold">
                          ¥{product.revenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300">
                          {product.order_count.toLocaleString()} 件
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* 下段: Creator別パフォーマンス */}
        <section id="creator-performance">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-200">
                Creator別パフォーマンス
              </h2>
            </div>

            {creatorPerformance.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">
                まだCreatorの売上データがありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">
                        Creator ID
                      </th>
                      <th className="text-right py-3 px-4 text-zinc-400 font-medium">
                        売上貢献
                      </th>
                      <th className="text-right py-3 px-4 text-zinc-400 font-medium">
                        注文件数
                      </th>
                      <th className="text-right py-3 px-4 text-zinc-400 font-medium">
                        貢献率
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {creatorPerformance.map((creator) => (
                      <tr
                        key={creator.creator_id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-4 text-zinc-100 font-mono text-xs">
                          {creator.creator_id.substring(0, 8)}...
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-300 font-semibold">
                          ¥{creator.revenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300">
                          {creator.order_count.toLocaleString()} 件
                        </td>
                        <td className="py-3 px-4 text-right text-amber-300 font-semibold">
                          {creator.contribution_rate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

