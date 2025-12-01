"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp,
  DollarSign,
  Trophy,
  Package,
  ArrowRight,
  LogOut,
  Zap,
  Target,
  Copy,
  CheckCircle,
} from "lucide-react";

type SalesStats = {
  totalSales: number;
  totalRevenue: number;
  estimatedCommission: number;
};

type BattleStatus = {
  category: string;
  rank: number;
  participants: number;
  gmv: number;
};

/**
 * インフルエンサー管理画面 - 司令室 / コマンドセンター
 */
export default function InfluencerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [salesStats, setSalesStats] = useState<SalesStats>({
    totalSales: 0,
    totalRevenue: 0,
    estimatedCommission: 0,
  });
  const [battles, setBattles] = useState<BattleStatus[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "http://localhost:3000/login";
          return;
        }

        // roleチェック
        const userRole = user.user_metadata?.role || "influencer";
        if (userRole !== "influencer") {
          window.location.href = "http://localhost:3000";
          return;
        }

        setUser(user);
        setReferralLink(
          typeof window !== "undefined"
            ? `${window.location.origin}?ref=${user.id}`
            : ""
        );
        await fetchSalesData(user.id, user.email || "");
        await fetchBattleStatus(user.id);
      } catch (error) {
        console.error("ユーザー認証エラー:", error);
        window.location.href = "http://localhost:3000/login";
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

  const fetchSalesData = async (userId: string, userEmail: string) => {
    try {
      // 1. 自分の affiliate_links を取得
      const { data: affiliateLinks, error: linksError } = await supabase
        .from("affiliate_links")
        .select("id, product_id")
        .eq("creator_id", userId);

      if (linksError) {
        console.error("Affiliate links fetch error:", linksError);
        return;
      }

      if (!affiliateLinks || affiliateLinks.length === 0) {
        // 紹介リンクが無い場合は売上0
        setSalesStats({
          totalSales: 0,
          totalRevenue: 0,
          estimatedCommission: 0,
        });
        return;
      }

      const affiliateLinkIds = affiliateLinks.map((link) => link.id);

      // 2. 自分の affiliate_link_id 経由の注文を取得
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, amount, product_id, created_at")
        .in("affiliate_link_id", affiliateLinkIds)
        .eq("status", "completed");

      if (ordersError) {
        console.error("Orders fetch error:", ordersError);
        return;
      }

      // 3. 商品ごとの分配率を取得
      const productIds = [...new Set(orders?.map((o) => o.product_id).filter(Boolean) || [])];
      const { data: products } = await supabase
        .from("products")
        .select("id, creator_share_rate")
        .in("id", productIds);

      const productRateMap = new Map(
        (products || []).map((p) => [p.id, p.creator_share_rate || 0.25])
      );

      // 4. 売上統計を計算
      const totalSales = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => {
        return sum + (order.amount || 0);
      }, 0) || 0;

      // 商品ごとの分配率で報酬を計算
      const estimatedCommission = orders?.reduce((sum, order) => {
        const rate = productRateMap.get(order.product_id) || 0.25;
        return sum + Math.floor((order.amount || 0) * rate);
      }, 0) || 0;

        setSalesStats({
          totalSales,
          totalRevenue,
          estimatedCommission,
        });
    } catch (error) {
      console.error("売上データの取得エラー:", error);
    }
  };

  const fetchBattleStatus = async (userId: string) => {
    try {
      const dummyBattles: BattleStatus[] = [
        {
          category: "美容",
          rank: 12,
          participants: 45,
          gmv: 1250000,
        },
        {
          category: "ガジェット",
          rank: 8,
          participants: 32,
          gmv: 980000,
        },
      ];
      setBattles(dummyBattles);
      setMyRank(12);
    } catch (error) {
      console.error("バトル状況の取得エラー:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "http://localhost:3000";
  };

  const handleCopyLink = async () => {
    if (referralLink) {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-16 md:pb-0">
      {/* ヘッダー */}
      <header className="border-b border-white/10 bg-gradient-to-r from-slate-950 to-black backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              司令室
            </h1>
            <p className="text-sm text-slate-400">コマンドセンター</p>
          </div>
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors text-sm border border-white/10"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 現在の報酬額 */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">現在の報酬額</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    ¥{salesStats.estimatedCommission.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                累計売上: ¥{salesStats.totalRevenue.toLocaleString()} (
                {salesStats.totalSales}件)
              </p>
            </div>

            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-900/10 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Trophy className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">総合ランキング</p>
                  <p className="text-3xl font-bold text-blue-400">
                    #{myRank || "---"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                参加中のバトル: {battles.length}件
              </p>
            </div>

            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-900/10 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                  <Target className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">参加中バトル</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {battles.length}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400">アクティブな販売活動中</p>
            </div>
          </div>
        </section>

        {/* 紹介リンク */}
        <section className="mb-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Copy className="w-5 h-5 text-cyan-400" />
              あなた専用の紹介リンク
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    コピー済み
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    コピー
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* 参加中のバトル */}
        {battles.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              参加中のバトル
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {battles.map((battle, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 hover:border-blue-500/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold">
                        {battle.category}カテゴリ
                      </h3>
                      <p className="text-sm text-slate-400">
                        {battle.participants}人が参加中
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-400">
                        #{battle.rank}
                      </p>
                      <p className="text-xs text-slate-400">現在の順位</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <span className="text-sm text-slate-400">カテゴリGMV</span>
                    <span className="text-sm font-bold">
                      ¥{battle.gmv.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/products")}
            className="group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-900/10 p-8 text-left hover:border-blue-500/50 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <Package className="w-8 h-8 text-blue-400" />
              <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="text-xl font-bold mb-2">商品を見る</h3>
            <p className="text-sm text-slate-400">
              データで選ばれた販売可能な商品一覧
            </p>
          </button>

          <button
            onClick={() => router.push("/products")}
            className="group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-900/10 p-8 text-left hover:border-purple-500/50 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8 text-purple-400" />
              <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="text-xl font-bold mb-2">今すぐ販売する</h3>
            <p className="text-sm text-slate-400">
              新しいバトルに参加して報酬を獲得
            </p>
          </button>
        </section>
      </main>
    </div>
  );
}

