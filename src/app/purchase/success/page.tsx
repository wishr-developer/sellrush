"use client";

/**
 * ⚠️ 重要: useSearchParams() を使用するため、Suspense boundary でラップする必要があります
 * Next.js 16 App Router では、useSearchParams() を使うクライアントコンポーネントは
 * 必ず Suspense でラップしないとビルド時にエラーが発生します。
 */
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";

/**
 * 購入完了ページ
 * Stripe Checkout から戻ってきた際に表示
 */
function PurchaseSuccessPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // セッションIDがある場合は少し待ってからローディングを解除
    // （Webhook処理が完了するまでの時間を考慮）
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          {isLoading ? (
            <>
              <div className="mb-4">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-emerald-500 border-r-transparent"></div>
              </div>
              <h1 className="text-xl font-semibold mb-2">決済を処理中...</h1>
              <p className="text-sm text-slate-400">
                注文情報を確認しています
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 flex justify-center">
                <CheckCircle className="h-16 w-16 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-semibold mb-2">決済が完了しました</h1>
              <p className="text-sm text-slate-400 mb-6">
                ご注文ありがとうございます。注文情報は数秒後に反映されます。
              </p>
              
              {sessionId && (
                <div className="mb-6 rounded-lg bg-slate-800/50 p-3 text-left">
                  <p className="text-xs text-slate-500 mb-1">セッションID</p>
                  <p className="text-xs font-mono text-slate-300 break-all">
                    {sessionId}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Link
                  href="/market"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
                >
                  商品一覧に戻る
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-6 py-3 text-sm font-medium text-slate-200 hover:border-slate-600 transition-colors"
                >
                  ダッシュボードへ
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          ご不明な点がございましたら、サポートまでお問い合わせください。
        </p>
      </div>
    </div>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-emerald-500 border-r-transparent"></div>
            </div>
            <p className="text-sm text-slate-400">読み込み中...</p>
          </div>
        </div>
      }
    >
      <PurchaseSuccessPageInner />
    </Suspense>
  );
}
