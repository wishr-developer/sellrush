"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { showErrorToast } from "@/components/ui/Toast";
import { DashboardSkeleton } from "@/components/ui/LoadingSkeleton";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import type { User, ProductPerformance, CreatorPerformance } from "@/types/dashboard";
import type { LoadingState, ErrorState } from "@/types/dashboard-loading";
import {
  initialLoadingState,
  initialErrorState,
} from "@/types/dashboard-loading";
import {
  calculateBrandKPIData,
  calculateProductPerformance,
  calculateCreatorPerformance,
} from "@/lib/dashboard-calculations";
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

// 型定義は @/types/dashboard からインポート
type KPIData = {
  totalRevenue: number;
  totalOrders: number;
  activeCreators: number;
};

/**
 * Brand Dashboard Client Component
 * 企業向け管理画面 - 自社商品の売上・パフォーマンスを表示
 */
export default function BrandDashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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

  // 個別のローディング/エラー状態管理（Phase 4パターン）
  const [loadingState, setLoadingState] = useState<LoadingState>(initialLoadingState);
  const [errorState, setErrorState] = useState<ErrorState>(initialErrorState);

  // 不正疑いの注文数（未レビュー）
  const [fraudFlagsCount, setFraudFlagsCount] = useState<number>(0);

  /**
   * ダッシュボードデータを取得
   * RLS前提: owner_id = auth.uid() の商品に紐づく orders のみ取得可能
   * 
   * データソース:
   * - products (自分の商品)
   * - orders (自分の商品に紐づく注文)
   * 
   * 計算ロジック:
   * - KPI: calculateBrandKPIData() を使用
   * - 商品別パフォーマンス: calculateProductPerformance() を使用
   * - クリエイター別パフォーマンス: calculateCreatorPerformance() を使用
   */
  const fetchDashboardData = useCallback(async (brandId: string) => {
    // ローディング開始、エラー状態をクリア
    setLoadingState((prev) => ({ ...prev, sales: true }));
    setErrorState((prev) => ({ ...prev, sales: null }));

    try {
      // 1. 自分の商品IDを取得
      // RLS前提: owner_id = auth.uid() の商品のみ取得可能
      const { data: myProducts, error: productsError } = await supabase
        .from("products")
        .select("id, name")
        .eq("owner_id", brandId);

      if (productsError) {
        console.error("商品データの取得に失敗しました:", productsError);
        setErrorState((prev) => ({
          ...prev,
          sales: "商品データの取得に失敗しました",
        }));
        showErrorToast("商品データの取得に失敗しました");
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
      // RLS前提: 関連する商品の owner_id = auth.uid() のみ取得可能
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, product_id, creator_id, amount")
        .in("product_id", productIds)
        .eq("status", "completed");

      if (ordersError) {
        console.error("注文データの取得に失敗しました:", ordersError);
        setErrorState((prev) => ({
          ...prev,
          sales: "注文データの取得に失敗しました",
        }));
        showErrorToast("注文データの取得に失敗しました");
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

      // 3. KPI を計算（統一計算関数を使用）
      const kpi = calculateBrandKPIData(orders as any);
      const activeCreators = new Set(
        orders.map((o) => o.creator_id).filter(Boolean)
      ).size;

      setKpiData({
        totalRevenue: kpi.totalRevenue,
        totalOrders: kpi.totalOrders,
        activeCreators,
      });

      // 4. 商品別パフォーマンスを計算（統一計算関数を使用）
      const productNameMap = new Map<string, string>();
      myProducts.forEach((product) => {
        productNameMap.set(product.id, product.name);
      });

      const productPerf = calculateProductPerformance(
        orders as any,
        productNameMap
      );
      setProductPerformance(productPerf);

      // 5. Creator別パフォーマンスを計算（統一計算関数を使用）
      const creatorPerf = calculateCreatorPerformance(
        orders as any,
        kpi.totalRevenue
      );
      setCreatorPerformance(creatorPerf);

      // 不正疑いの注文数を取得（自分の商品の注文に紐づく fraud_flags）
      // RLS前提: brand_id = auth.uid() の fraud_flags のみ取得可能（Adminのみ全件取得可能）
      // 注意: 現在は Admin のみ fraud_flags を閲覧可能なため、
      // Brand は直接取得できない可能性がある
      // 将来的には RLS ポリシーを追加して Brand も自分の商品の fraud_flags を閲覧可能にする
      try {
        // 自分の商品IDを取得
        const productIds = myProducts.map((p) => p.id);

        // 自分の商品の注文IDを取得
        const { data: myOrders } = await supabase
          .from("orders")
          .select("id")
          .in("product_id", productIds)
          .eq("status", "completed");

        if (myOrders && myOrders.length > 0) {
          const orderIds = myOrders.map((o) => o.id);

          // 自分の商品の注文に紐づく fraud_flags を取得
          // 注意: 現在は Admin のみ閲覧可能なため、エラーになる可能性がある
          const { data: flags, error: flagsError } = await supabase
            .from("fraud_flags")
            .select("id")
            .in("order_id", orderIds)
            .eq("reviewed", false);

          if (flagsError) {
            // RLS でアクセスできない場合はエラーを無視（将来の実装を待つ）
            if (process.env.NODE_ENV === "development") {
              console.warn("Fraud flags fetch error (may be RLS restriction):", flagsError);
            }
            setFraudFlagsCount(0);
          } else {
            setFraudFlagsCount(flags?.length || 0);
          }
        } else {
          setFraudFlagsCount(0);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Fraud flags count fetch error:", error);
        }
        setFraudFlagsCount(0);
      }
    } catch (error) {
      console.error("ダッシュボードデータの取得エラー:", error);
      setErrorState((prev) => ({
        ...prev,
        sales: "ダッシュボードデータの取得中にエラーが発生しました",
      }));
    } finally {
      // ローディング終了
      setLoadingState((prev) => ({ ...prev, sales: false }));
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

  // loading 中はスケルトンローディングを表示
  if (isLoading) {
    return <DashboardSkeleton />;
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
        {/* データソース: orders (fetchDashboardData で取得) */}
        {/* 計算ロジック: calculateBrandKPIData() を使用 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* 総売上カード */}
          <DashboardCard
            title="総売上"
            icon={<DollarSign className="w-5 h-5 text-emerald-300" />}
            isLoading={loadingState.sales}
            error={errorState.sales}
            onRetry={user?.id ? () => fetchDashboardData(user.id) : undefined}
            className="bg-zinc-950/70"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="flex-1">
                <p className="text-xl font-semibold">
                  ¥{kpiData.totalRevenue.toLocaleString()}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  広告費なしで発生した実売上です
                </p>
              </div>
            </div>
          </DashboardCard>

          {/* 注文件数カード */}
          <DashboardCard
            title="注文件数"
            icon={<TrendingUp className="w-5 h-5 text-sky-300" />}
            isLoading={loadingState.sales}
            error={errorState.sales}
            onRetry={user?.id ? () => fetchDashboardData(user.id) : undefined}
            className="bg-zinc-950/70"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-sky-300" />
              </div>
              <div className="flex-1">
                <p className="text-xl font-semibold">
                  {kpiData.totalOrders.toLocaleString()} 件
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Creator経由の注文件数です
                </p>
              </div>
            </div>
          </DashboardCard>

          {/* アクティブ Creatorカード */}
          <DashboardCard
            title="アクティブ Creator"
            icon={<Users className="w-5 h-5 text-amber-300" />}
            isLoading={loadingState.sales}
            error={errorState.sales}
            onRetry={user?.id ? () => fetchDashboardData(user.id) : undefined}
            className="bg-zinc-950/70"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-amber-300" />
              </div>
              <div className="flex-1">
                <p className="text-xl font-semibold">
                  {kpiData.activeCreators.toLocaleString()} 人
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  直近で成果が出ているCreator数です
                </p>
              </div>
            </div>
          </DashboardCard>
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

