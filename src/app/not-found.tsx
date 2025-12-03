import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

/**
 * 404 Not Found Page
 * 
 * App Router のカスタム 404 ページ
 * 存在しないルートにアクセスした際に表示される
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* 404 タイトル */}
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-400">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-white">
            ページが見つかりませんでした
          </h2>
          <p className="text-sm text-zinc-400">
            The page you're looking for could not be found.
          </p>
        </div>

        {/* 説明 */}
        <p className="text-sm text-zinc-300 leading-relaxed">
          お探しのページは存在しないか、移動または削除された可能性があります。
        </p>

        {/* CTA ボタン */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black shadow-[0_18px_40px_rgba(15,23,42,0.85)] transition hover:-translate-y-0.5 hover:bg-slate-50"
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

