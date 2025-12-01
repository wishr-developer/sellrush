"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  price: number;
  company_name: string;
  image_url: string | null;
  description?: string | null;
  creator_share_rate?: number;
}

export default function PurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("product_id");
  const affiliateCode = searchParams.get("affiliate");

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    } else {
      setError("商品IDが指定されていません");
      setIsLoading(false);
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, company_name, image_url, description, creator_share_rate")
        .eq("id", productId)
        .eq("status", "active")
        .single();

      if (error || !data) {
        setError("商品が見つかりません");
        return;
      }

      setProduct(data as Product);
    } catch (error) {
      console.error("Product fetch error:", error);
      setError("商品の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!product) return;

    try {
      setIsPurchasing(true);
      setError(null);

      // Stripe Checkout Session を作成
      const response = await fetch("/api/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: product.id,
          affiliate_code: affiliateCode || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "決済セッションの作成に失敗しました");
      }

      const result = await response.json();
      
      // Stripe Checkout にリダイレクト
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("Checkout URL が取得できませんでした");
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      setError(error.message || "決済処理に失敗しました");
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">読み込み中...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-400 mb-4">{error || "商品が見つかりません"}</p>
          <button
            onClick={() => router.push("/market")}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
          >
            商品一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  const estReward = Math.round(product.price * (product.creator_share_rate || 0.25));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">商品購入</h1>
          <p className="mt-1 text-xs text-slate-400">
            クリエイターの紹介リンク経由で購入します
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 商品情報 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="relative h-64 w-full overflow-hidden rounded-xl bg-slate-900 mb-4">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  {product.name}
                </div>
              )}
            </div>
            <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
            <p className="text-sm text-slate-400 mb-4">{product.company_name}</p>
            {product.description && (
              <p className="text-sm text-slate-300 mb-4">{product.description}</p>
            )}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-sm text-slate-400">販売価格</span>
              <span className="text-2xl font-bold">¥{product.price.toLocaleString()}</span>
            </div>
          </div>

          {/* 注文フォーム */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h3 className="text-lg font-semibold mb-4">注文情報</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">商品名</span>
                <span className="text-sm text-slate-100">{product.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">価格</span>
                <span className="text-lg font-semibold">¥{product.price.toLocaleString()}</span>
              </div>
              {affiliateCode && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/40 p-3">
                  <p className="text-xs text-emerald-400 mb-1">クリエイター紹介経由</p>
                  <p className="text-xs text-slate-400">
                    この購入により、クリエイターに約 ¥{estReward.toLocaleString()} の報酬が発生します
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/40 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPurchasing ? "注文処理中..." : "注文を確定する"}
            </button>

            <p className="mt-4 text-xs text-slate-500 text-center">
              ※ この注文はデモ環境での処理です
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

