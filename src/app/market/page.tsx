"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

interface MarketProduct {
  id: string;
  name: string;
  price: number;
  company_name: string;
  image_url: string | null;
  creator_share_rate: number;
  status: string;
  category?: string | null;
}

interface AffiliateLink {
  product_id: string;
  affiliate_code: string;
}

export default function MarketPage() {
  const router = useRouter();
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [participatingProducts, setParticipatingProducts] = useState<Set<string>>(new Set());
  const [creatingLinks, setCreatingLinks] = useState<Set<string>>(new Set());
  const [affiliateLinks, setAffiliateLinks] = useState<Map<string, string>>(new Map());
  const [brandNames, setBrandNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    checkAuth();
    fetchProducts();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // ログイン済みクリエイターの場合、参加商品を取得
        const userRole = user.user_metadata?.role;
        if (userRole === "creator" || userRole === "influencer") {
          await fetchParticipatingProducts(user.id);
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, company_name, owner_id, image_url, creator_share_rate, status, category")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Products fetch error:", error);
        setError("商品の取得に失敗しました");
        return;
      }

      if (data) {
        setProducts(data as MarketProduct[]);
        setError(null);
      }
    } catch (error) {
      console.error("Products fetch error:", error);
      setError("商品の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParticipatingProducts = async (creatorId: string) => {
    try {
      const { data, error } = await supabase
        .from("affiliate_links")
        .select("product_id, affiliate_code")
        .eq("creator_id", creatorId)
        .eq("status", "active");

      if (error) {
        console.error("Affiliate links fetch error:", error);
        return;
      }

      if (data) {
        const productIds = new Set(data.map((link) => link.product_id));
        setParticipatingProducts(productIds);
        
        // 紹介リンクコードをマップに保存
        const linkMap = new Map<string, string>();
        data.forEach((link) => {
          linkMap.set(link.product_id, link.affiliate_code);
        });
        setAffiliateLinks(linkMap);
      }
    } catch (error) {
      console.error("Affiliate links fetch error:", error);
    }
  };

  const handleJoinProduct = async (productId: string) => {
    if (!user) {
      router.push("/login?redirect=/market");
      return;
    }

    const userRole = user.user_metadata?.role;
    if (userRole !== "creator" && userRole !== "influencer") {
      alert("クリエイターとしてログインしてください");
      return;
    }

    // 既に参加している場合は紹介リンクをコピー
    if (participatingProducts.has(productId)) {
      const affiliateCode = affiliateLinks.get(productId);
      if (affiliateCode) {
        const link = `${window.location.origin}/purchase?product_id=${productId}&affiliate=${affiliateCode}`;
        await navigator.clipboard.writeText(link);
        alert("紹介リンクをクリップボードにコピーしました");
      }
      return;
    }

    try {
      setCreatingLinks((prev) => new Set(prev).add(productId));

      // 紹介リンク作成APIを呼び出し
      const response = await fetch("/api/affiliate-links/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ product_id: productId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "紹介リンクの作成に失敗しました");
      }

      const result = await response.json();
      
      // 参加商品リストを更新
      setParticipatingProducts((prev) => new Set(prev).add(productId));
      setAffiliateLinks((prev) => new Map(prev).set(productId, result.affiliate_code));

      // 紹介リンクをクリップボードにコピー
      const link = `${window.location.origin}/purchase?product_id=${productId}&affiliate=${result.affiliate_code}`;
      await navigator.clipboard.writeText(link);
      alert("紹介リンクを作成し、クリップボードにコピーしました");
    } catch (error: any) {
      console.error("Join product error:", error);
      alert(error.message || "紹介リンクの作成に失敗しました");
    } finally {
      setCreatingLinks((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const isCreator = user && (user.user_metadata?.role === "creator" || user.user_metadata?.role === "influencer");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              ARENA MARKET
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              商品アリーナ – どの商品で参戦する？
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              ここに掲載されている商品は、インフルエンサー・クリエイターが自由に選んで販売バトルに参加できます。
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500"
            >
              クリエイターダッシュボードへ
            </Link>
            <Link
              href="/brand"
              className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500"
            >
              ブランド用コンソールへ
            </Link>
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
                fetchProducts();
              }}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
            >
              再試行
            </button>
          </div>
        ) : (
          <>
        <section className="grid gap-4 md:grid-cols-3">
              {products.map((p) => {
                const estReward = Math.round(p.price * (p.creator_share_rate || 0.25));
                const isParticipating = participatingProducts.has(p.id);
                const isCreating = creatingLinks.has(p.id);
                const shareRate = p.creator_share_rate || 0.25;

            return (
              <article
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60"
              >
                <div className="relative h-40 overflow-hidden bg-slate-900">
                      {p.image_url ? (
                        <Image
                          src={p.image_url}
                          alt={p.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-slate-500">
                    {p.name}
                  </div>
                      )}
                      {isParticipating && (
                        <div className="absolute top-2 right-2 rounded-full bg-emerald-500/90 px-2 py-1 text-[10px] font-semibold text-slate-950">
                          参加中
                        </div>
                      )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div>
                        <p className="text-[11px] text-slate-500">{p.company_name || "ブランド未設定"}</p>
                    <h2 className="text-sm font-semibold text-slate-50">
                      {p.name}
                    </h2>
                        {p.category && (
                          <p className="mt-1 text-[10px] text-slate-600">{p.category}</p>
                        )}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[11px] text-slate-500">販売価格</p>
                      <p className="text-slate-100">¥{p.price.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">
                        インフルエンサー報酬（目安）
                      </p>
                      <p className="text-emerald-400">
                        約 ¥{estReward.toLocaleString()}{" "}
                        <span className="text-[11px] text-slate-500">
                              ({Math.round(shareRate * 100)}%)
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex gap-2">
                        {isCreator ? (
                          <button
                            onClick={() => handleJoinProduct(p.id)}
                            disabled={isCreating}
                            className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                              isParticipating
                                ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                                : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                            } ${isCreating ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {isCreating
                              ? "作成中..."
                              : isParticipating
                              ? "リンクをコピー"
                              : "この商品で参戦"}
                    </button>
                        ) : (
                          <Link
                            href="/login?redirect=/market"
                            className="flex-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-center text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                          >
                            ログインして参戦
                          </Link>
                        )}
                    <button className="rounded-xl border border-slate-700 px-3 py-1.5 text-[11px] text-slate-200 hover:border-slate-500">
                      詳細
                    </button>
                  </div>

                      {isCreator && (
                  <p className="mt-1 text-[11px] text-slate-500">
                          {isParticipating
                            ? "※ 既に参加済みです。ボタンをクリックして紹介リンクをコピーできます。"
                            : "※ この商品を選んで販売バトルに参加できます。"}
                  </p>
                      )}
                </div>
              </article>
            );
          })}
        </section>

            {products.length === 0 && (
          <p className="mt-8 text-center text-xs text-slate-500">
            現在、参加可能な商品がありません。しばらくしてから再度アクセスしてください。
          </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

