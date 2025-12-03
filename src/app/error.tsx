"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCw, ArrowLeft } from "lucide-react";

/**
 * Error Boundary Component
 * 
 * App Router のエラーバウンダリ
 * 予期しないエラーが発生した際に表示される
 * 
 * 注意: このコンポーネントは "use client" である必要があります
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをログに記録（開発環境のみ）
    if (process.env.NODE_ENV === "development") {
      console.error("Error boundary caught:", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* エラータイトル */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-red-400">エラーが発生しました</h1>
          <p className="text-sm text-zinc-400">
            An error occurred while processing your request.
          </p>
        </div>

        {/* エラーメッセージ（開発環境のみ表示） */}
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-left">
            <p className="text-xs font-semibold text-red-400 mb-2">エラー詳細（開発環境のみ）:</p>
            <p className="text-xs text-red-300 font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-zinc-500 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* 説明 */}
        <p className="text-sm text-zinc-300 leading-relaxed">
          申し訳ございません。予期しないエラーが発生しました。
          <br />
          しばらく時間をおいてから再度お試しください。
        </p>

        {/* CTA ボタン */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black shadow-[0_18px_40px_rgba(15,23,42,0.85)] transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            もう一度試す
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <Home className="w-4 h-4" />
            トップページに戻る
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            ログインページへ
          </Link>
        </div>

        {/* 補足情報 */}
        <p className="text-xs text-zinc-500 mt-8">
          問題が続く場合は、サポートまでお問い合わせください。
        </p>
      </div>
    </div>
  );
}

