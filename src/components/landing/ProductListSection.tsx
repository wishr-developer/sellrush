"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Loader2, ArrowRight } from "lucide-react";
import type { Product } from "@/types/product";

type SortOption = "newest" | "price-low" | "price-high" | "reward-high";
type FilterCategory = "all" | string;

type Props = {
  products: Product[];
  isLoading?: boolean;
};

/**
 * 商品一覧セクション
 * フィルタ・ソートUI + 商品カードグリッド
 */
export const ProductListSection: React.FC<Props> = ({
  products,
  isLoading = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  // フィルタリング・ソート処理
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // カテゴリフィルタ
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // ソート
    switch (sortOption) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "reward-high":
        // 報酬率が高い順（価格の30%を報酬と仮定）
        filtered.sort((a, b) => b.price * 0.3 - a.price * 0.3);
        break;
      case "newest":
      default:
        // 既にcreated_atでソート済み
        break;
    }

    return filtered;
  }, [products, selectedCategory, sortOption]);

  // カテゴリ一覧の取得
  const categories = useMemo(() => {
    const cats = products
      .map((p) => p.category)
      .filter((c): c is string => !!c);
    return ["all", ...Array.from(new Set(cats))];
  }, [products]);

  // 注文処理
  const handlePurchase = async (product: Product) => {
    if (
      !confirm(
        `${product.name} (¥${product.price.toLocaleString()}) で販売を開始しますか？`
      )
    ) {
      return;
    }

    setPurchasingId(product.id);

    try {
      // URLパラメータから紹介者IDを取得
      const urlParams = new URLSearchParams(window.location.search);
      const referrer = urlParams.get("ref") || null;

      const { error } = await supabase.from("orders").insert([
        {
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          buyer_name: "ゲスト購入者",
          referrer: referrer,
          status: "pending",
        },
      ]);

      if (error) throw error;

      alert("🎉 販売を開始しました！\nダッシュボードで進捗を確認できます。");
    } catch (error) {
      console.error("Purchase error:", error);
      alert("販売開始に失敗しました。もう一度お試しください。");
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <section id="products" className="py-20 px-4 md:px-8 lg:px-16 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Products
            </div>
            <h2 className="text-3xl font-bold">販売可能な商品</h2>
          </div>
        </div>

        {/* フィルタ・ソートUI */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* カテゴリフィルタ */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">カテゴリ:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-[#111] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                {categories
                  .filter((c) => c !== "all")
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
            </div>

            {/* ソート */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">並び替え:</label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="px-4 py-2 bg-[#111] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">新着順</option>
                <option value="price-low">価格: 安い順</option>
                <option value="price-high">価格: 高い順</option>
                <option value="reward-high">報酬: 高い順</option>
              </select>
            </div>
          </div>
        </div>

        {/* 商品グリッド */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[400px] rounded-3xl bg-[#111] animate-pulse border border-white/5"
              ></div>
            ))}
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed border-gray-800">
            <p className="text-gray-500">該当する商品が見つかりませんでした。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredAndSortedProducts.map((product) => {
              const reward = Math.floor(product.price * 0.3);
              return (
                <div
                  key={product.id}
                  className="group relative bg-[#111] rounded-3xl overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10"
                >
                  {/* 画像エリア */}
                  <div className="aspect-[4/3] relative overflow-hidden bg-gray-900">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-medium text-white border border-white/10">
                        {product.company_name || product.brand_name || "Official"}
                      </span>
                    </div>
                  </div>

                  {/* コンテンツエリア */}
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold mb-1 group-hover:text-blue-400 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500">在庫: {product.stock} 点</p>
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">参考販売価格</span>
                        <span className="text-2xl font-bold">
                          ¥{product.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <span className="text-sm text-gray-400">インフルエンサー報酬</span>
                        <span className="text-lg font-bold text-green-400">
                          ¥{reward.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePurchase(product)}
                      disabled={
                        purchasingId === product.id || product.stock === 0
                      }
                      className="w-full py-3 px-4 bg-white text-black rounded-xl font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {purchasingId === product.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          処理中...
                        </>
                      ) : (
                        <>
                          この商品で販売をはじめる
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

