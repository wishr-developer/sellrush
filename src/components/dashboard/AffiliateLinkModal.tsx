"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check, Share2, QrCode } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Product, CreateAffiliateLinkResponse } from "@/types/dashboard";
import { showSuccessToast, showErrorToast } from "@/components/ui/Toast";
import QRCode from "qrcode";

interface AffiliateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (affiliateCode: string, productId: string) => void;
}

/**
 * 紹介リンク生成モーダルコンポーネント
 * 商品を選択して紹介リンクを生成し、コピー・QRコード表示・SNSシェアが可能
 */
export function AffiliateLinkModal({
  isOpen,
  onClose,
  onSuccess,
}: AffiliateLinkModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [affiliateLink, setAffiliateLink] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルが開いたときに商品一覧を取得
  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    } else {
      // モーダルが閉じたときに状態をリセット
      resetState();
    }
  }, [isOpen]);

  // 紹介リンクが生成されたらQRコードを生成
  useEffect(() => {
    if (affiliateLink) {
      generateQRCode(affiliateLink);
    }
  }, [affiliateLink]);

  const resetState = () => {
    setSelectedProductId("");
    setAffiliateCode(null);
    setAffiliateLink(null);
    setQrCodeDataUrl(null);
    setCopied(false);
    setError(null);
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, creator_share_rate")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      if (data) {
        setProducts(data as Product[]);
        if (data.length > 0) {
          setSelectedProductId(data[0].id);
        }
      }
    } catch (err: any) {
      setError("商品の取得に失敗しました");
      console.error("Products fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async (text: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(text, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (err) {
      console.error("QR code generation error:", err);
    }
  };

  const handleCreateAffiliateLink = async () => {
    if (!selectedProductId) {
      setError("商品を選択してください");
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const response = await fetch("/api/affiliate-links/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ product_id: selectedProductId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "紹介リンクの作成に失敗しました");
      }

      const result: CreateAffiliateLinkResponse = await response.json();
      const code = result.affiliate_code;
      const link = `${window.location.origin}/purchase?product_id=${selectedProductId}&affiliate=${code}`;

      setAffiliateCode(code);
      setAffiliateLink(link);

      showSuccessToast("紹介リンクを生成しました！");

      // 成功コールバックを呼び出し
      if (onSuccess) {
        onSuccess(code, selectedProductId);
      }
    } catch (err: any) {
      const errorMessage = err.message || "紹介リンクの作成に失敗しました";
      setError(errorMessage);
      showErrorToast(errorMessage);
      console.error("Create affiliate link error:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!affiliateLink) return;

    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      showSuccessToast("リンクをクリップボードにコピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const errorMessage = "リンクのコピーに失敗しました";
      setError(errorMessage);
      showErrorToast(errorMessage);
    }
  };

  const handleShareTwitter = () => {
    if (!affiliateLink) return;
    const selectedProduct = products.find((p) => p.id === selectedProductId);
    const text = selectedProduct
      ? `${selectedProduct.name} の紹介リンクです！`
      : "紹介リンクをシェアします！";
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(affiliateLink)}`;
    window.open(url, "_blank");
  };

  const handleShareLine = () => {
    if (!affiliateLink) return;
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(affiliateLink)}`;
    window.open(url, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">紹介リンクを発行</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* 商品選択 */}
        {!affiliateLink && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                商品を選択
              </label>
              {isLoading ? (
                <div className="p-4 text-center text-sm text-zinc-500">
                  読み込み中...
                </div>
              ) : products.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-500">
                  商品が見つかりませんでした
                </div>
              ) : (
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (¥{product.price?.toLocaleString() || 0})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={handleCreateAffiliateLink}
              disabled={isCreating || !selectedProductId || isLoading}
              className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isCreating ? "作成中..." : "紹介リンクを生成"}
            </button>
          </div>
        )}

        {/* 紹介リンク表示 */}
        {affiliateLink && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-white/10">
              <p className="text-xs text-zinc-400 mb-2">紹介コード</p>
              <p className="text-lg font-mono text-emerald-400 break-all">
                {affiliateCode}
              </p>
            </div>

            <div className="p-4 bg-zinc-800/50 rounded-lg border border-white/10">
              <p className="text-xs text-zinc-400 mb-2">紹介リンク</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={affiliateLink}
                  readOnly
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
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

            {/* QRコード表示 */}
            {qrCodeDataUrl && (
              <div className="flex flex-col items-center p-4 bg-zinc-800/50 rounded-lg border border-white/10">
                <p className="text-xs text-zinc-400 mb-3">QRコード</p>
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code"
                  className="w-48 h-48 bg-white p-2 rounded-lg"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  スマートフォンで読み取ってシェアできます
                </p>
              </div>
            )}

            {/* SNSシェアボタン */}
            <div className="flex gap-2">
              <button
                onClick={handleShareTwitter}
                className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-400 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Twitterでシェア
              </button>
              <button
                onClick={handleShareLine}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                LINEでシェア
              </button>
            </div>

            <button
              onClick={() => {
                resetState();
                onClose();
              }}
              className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

