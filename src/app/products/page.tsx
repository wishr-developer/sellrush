"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MobileTabBar from "@/components/MobileTabBar";
import { Package, ArrowRight, CheckCircle, Zap } from "lucide-react";
import type { Product } from "@/types/product";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=600&q=80";

/**
 * 商品一覧ページ（ログイン必須）
 * 参加済み/未参加がわかるUI
 */
export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [participatingProducts, setParticipatingProducts] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirect=/products");
        return;
      }

      setUser(user);
      await fetchProducts();
      await fetchParticipatingProducts(user.id);
    };

    checkAuth();
  }, [router]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("商品データの取得に失敗しました:", error);
        }
        return;
      }

      if (data) {
        setProducts((data || []) as Product[]);
      }
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("商品データの取得エラー:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 参加済み商品を取得
   */
  const fetchParticipatingProducts = async (userId: string) => {
    try {
      // ユーザーが参加している商品IDを取得（ordersテーブルから）
      const { data, error } = await supabase
        .from("orders")
        .select("product_id")
        .eq("referrer", userId)
        .not("product_id", "is", null);

      if (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("参加商品の取得に失敗:", error);
        }
        return;
      }

      if (data) {
        const productIds = new Set(data.map((order) => order.product_id).filter(Boolean));
        setParticipatingProducts(productIds);
      }
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("参加商品の取得エラー:", error);
      }
    }
  };

  /**
   * 商品で販売を開始
   */
  const handleStartSelling = async (product: Product) => {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      // 注文を作成（参加記録）
      const { error } = await supabase.from("orders").insert([
        {
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          referrer: user.id,
          status: "participating", // 参加中
        },
      ]);

      if (error) throw error;

      // 参加済みリストに追加
      setParticipatingProducts((prev) => new Set([...prev, product.id]));

      alert(`🎉 ${product.name} で販売を開始しました！`);
    } catch (error: any) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("販売開始エラー:", error);
      }
      alert("販売開始に失敗しました。もう一度お試しください。");
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

  return (
    <div className="min-h-screen bg-black text-white pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-400" />
            商品一覧
          </h1>
          <p className="text-slate-400">
            データで選ばれた販売可能な商品から選んで、販売バトルに参加しましょう
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-slate-800 bg-slate-950/50">
            <p className="text-slate-400">商品がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const isParticipating = participatingProducts.has(product.id);
              const reward = Math.floor(product.price * 0.3); // 30%報酬

              return (
                <div
                  key={product.id}
                  className={`group relative rounded-2xl border ${
                    isParticipating
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-slate-800 bg-slate-950/50"
                  } p-6 hover:border-blue-500/30 transition-all`}
                >
                  {/* 参加済みバッジ */}
                  {isParticipating && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-medium">
                        参加中
                      </span>
                    </div>
                  )}

                  {/* 商品画像 */}
                  <div className="aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-slate-900">
                    <img
                      src={product.image_url || FALLBACK_IMAGE}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* 商品情報 */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold flex-1">{product.name}</h3>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      {product.company_name || product.brand_name || "Official"}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">参考販売価格</span>
                        <span className="text-xl font-bold">
                          ¥{product.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <span className="text-sm text-slate-400">インフルエンサー報酬</span>
                        <span className="text-lg font-bold text-emerald-400">
                          ¥{reward.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>在庫: {product.stock}点</span>
                        {product.category && (
                          <span className="px-2 py-1 bg-slate-800 rounded-full">
                            {product.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CTAボタン */}
                  <button
                    onClick={() => handleStartSelling(product)}
                    disabled={isParticipating}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      isParticipating
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 hover:scale-105"
                    }`}
                  >
                    {isParticipating ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        参加済み
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        この商品で販売をはじめる
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MobileTabBar />
    </div>
  );
}
