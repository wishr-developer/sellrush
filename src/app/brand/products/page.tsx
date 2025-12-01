"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
  company_name: string;
  created_at: string;
  updated_at?: string | null;
  creator_share_rate?: number;
  platform_take_rate?: number;
}

interface ProductWithStats extends Product {
  lastOrderAt: string | null;
  totalOrders: number;
  totalGmv: number;
}

export default function BrandProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/brand/products");
        return;
      }

      const userRole = user.user_metadata?.role;
      if (userRole !== "brand" && userRole !== "company") {
        router.push("/");
        return;
      }

      setUser(user);
      await fetchProducts(user.id);
    } catch (error) {
      console.error("Auth check error:", error);
      router.push("/login?redirect=/brand/products");
    }
  };

  const fetchProducts = async (userId: string) => {
    try {
      setIsLoading(true);

      // 自社商品を取得
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (productsError) {
        console.error("Products fetch error:", productsError);
        setError("商品データの取得に失敗しました");
        setIsLoading(false);
        return;
      }

      if (!productsData || productsData.length === 0) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      // 商品ごとの注文統計を取得
      const productIds = productsData.map((p) => p.id);
      const { data: ordersData } = await supabase
        .from("orders")
        .select("product_id, amount, created_at")
        .in("product_id", productIds)
        .eq("status", "completed");

      // 商品ごとに集計
      const productStatsMap = new Map<
        string,
        { lastOrderAt: string | null; totalOrders: number; totalGmv: number }
      >();

      ordersData?.forEach((order) => {
        const existing = productStatsMap.get(order.product_id) || {
          lastOrderAt: null,
          totalOrders: 0,
          totalGmv: 0,
        };
        existing.totalOrders += 1;
        existing.totalGmv += order.amount || 0;
        const orderDate = new Date(order.created_at);
        if (
          !existing.lastOrderAt ||
          new Date(existing.lastOrderAt) < orderDate
        ) {
          existing.lastOrderAt = order.created_at;
        }
        productStatsMap.set(order.product_id, existing);
      });

      // 商品データと統計を結合
      const productsWithStats: ProductWithStats[] = productsData.map((p) => {
        const stats = productStatsMap.get(p.id) || {
          lastOrderAt: null,
          totalOrders: 0,
          totalGmv: 0,
        };
        return {
          ...p,
          lastOrderAt: stats.lastOrderAt,
          totalOrders: stats.totalOrders,
          totalGmv: stats.totalGmv,
        };
      });

      setProducts(productsWithStats);
      setError(null);
    } catch (error) {
      console.error("Products fetch error:", error);
      setError("商品データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    if (user) {
      fetchProducts(user.id);
    }
  };
  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            BRAND PRODUCTS
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-50">
            商品一覧
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            自社が SELL RUSH に掲載している商品です。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-emerald-400"
          >
            新しい商品を登録
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-slate-400">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              if (user) {
                fetchProducts(user.id);
              }
            }}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
          >
            再試行
          </button>
        </div>
      ) : (
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/70 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">商品名</th>
              <th className="px-3 py-2">価格</th>
              <th className="px-3 py-2">ステータス</th>
                <th className="px-3 py-2">売上</th>
              <th className="px-3 py-2">最終注文日</th>
              <th className="px-3 py-2 text-right">アクション</th>
            </tr>
          </thead>
          <tbody>
              {products.map((p) => {
                const lastOrderDate = p.lastOrderAt
                  ? new Date(p.lastOrderAt).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })
                  : null;

                return (
              <tr
                key={p.id}
                className="border-b border-slate-900/80 hover:bg-slate-900/60"
              >
                <td className="px-3 py-2 align-middle">
                  <p className="text-xs text-slate-100">{p.name}</p>
                  <p className="text-[11px] text-slate-500">{p.id}</p>
                </td>
                <td className="px-3 py-2 align-middle">
                  <span className="text-xs text-slate-100">
                    ¥{p.price.toLocaleString()}
                  </span>
                </td>
                <td className="px-3 py-2 align-middle">
                  <span
                    className={`inline-flex rounded-full px-2 py-[2px] text-[11px] ${
                          p.status === "active"
                        ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border border-slate-600/60 bg-slate-700/40 text-slate-300"
                    }`}
                  >
                        {p.status === "active" ? "公開中" : "下書き"}
                  </span>
                </td>
                    <td className="px-3 py-2 align-middle">
                      <p className="text-xs text-slate-100">
                        ¥{p.totalGmv.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {p.totalOrders} 件
                      </p>
                    </td>
                <td className="px-3 py-2 align-middle text-[11px] text-slate-400">
                      {lastOrderDate ?? "-"}
                </td>
                <td className="px-3 py-2 align-middle text-right">
                      <button
                        onClick={() => handleEdit(p)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300"
                  >
                        編集
                      </button>
                </td>
              </tr>
                );
              })}
              {products.length === 0 && (
              <tr>
                <td
                    colSpan={6}
                  className="px-3 py-6 text-center text-xs text-slate-500"
                >
                  まだ商品が登録されていません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )}

      {/* 商品登録・編集モーダル */}
      {isModalOpen && (
        <ProductModal
          product={editingProduct}
          userId={user?.id}
          onClose={handleCloseModal}
          onSuccess={handleCloseModal}
        />
      )}
    </div>
  );
}

// 商品登録・編集モーダルコンポーネント
function ProductModal({
  product,
  userId,
  onClose,
  onSuccess,
}: {
  product: Product | null;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    price: product?.price || 0,
    stock: 0,
    status: product?.status || "active",
    company_name: product?.company_name || "",
    image_url: "",
    creator_share_rate: product?.creator_share_rate || 0.25,
    platform_take_rate: product?.platform_take_rate || 0.15,
    description: "",
    category: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (!userId) {
        throw new Error("ユーザー情報が取得できません");
      }

      // 会社名を取得
      const { data: company } = await supabase
        .from("companies")
        .select("company_name")
        .eq("owner_id", userId)
        .single();

      const productData = {
        name: formData.name,
        price: formData.price,
        stock: formData.stock,
        status: formData.status,
        company_name: company?.company_name || formData.company_name,
        image_url: formData.image_url || null,
        owner_id: userId,
        creator_share_rate: formData.creator_share_rate,
        platform_take_rate: formData.platform_take_rate,
        category: formData.category || null,
        description: formData.description || null,
      };

      if (product) {
        // 更新
        const { error: updateError } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id);

        if (updateError) throw updateError;
      } else {
        // 新規作成
        const { error: insertError } = await supabase
          .from("products")
          .insert(productData);

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (error: any) {
      console.error("Product save error:", error);
      setError(error.message || "商品の保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {product ? "商品を編集" : "新しい商品を登録"}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-200">
                商品名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-200">
                  価格 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-200">
                  在庫数
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-200">
                画像URL
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-200">
                  クリエイター分配率
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.creator_share_rate}
                  onChange={(e) => setFormData({ ...formData, creator_share_rate: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
                <p className="text-xs text-slate-500 mt-1">
                  デフォルト: 0.25 (25%)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-200">
                  プラットフォーム分配率
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.platform_take_rate}
                  onChange={(e) => setFormData({ ...formData, platform_take_rate: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
                <p className="text-xs text-slate-500 mt-1">
                  デフォルト: 0.15 (15%)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-200">
                ステータス
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                <option value="active">公開中</option>
                <option value="inactive">下書き</option>
              </select>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/40 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {isSaving ? "保存中..." : product ? "更新" : "登録"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

