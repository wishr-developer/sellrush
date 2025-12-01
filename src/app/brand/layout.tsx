import type { ReactNode } from "react";
import Link from "next/link";

export default function BrandLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        {/* Sidebar */}
        <aside className="hidden w-60 flex-shrink-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-4 md:flex">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              SELL RUSH
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-50">
              Brand Console
            </p>
            <p className="mt-1 text-xs text-slate-500">
              あなたのブランドの商品と売上を管理します。
            </p>
          </div>

          <nav className="space-y-1 text-sm">
            <Link
              href="/brand"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-slate-200 hover:bg-slate-800"
            >
              <span>ダッシュボード</span>
            </Link>
            <Link
              href="/brand/products"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-slate-200 hover:bg-slate-800"
            >
              <span>商品一覧</span>
            </Link>
            {/* 将来: キャンペーン / バトル設定など */}
            <div className="mt-4 border-t border-slate-800 pt-4">
              <Link
                href="/dashboard"
                className="text-xs text-slate-500 hover:text-slate-200"
              >
                クリエイターダッシュボードへ
              </Link>
              <br />
              <Link
                href="/"
                className="text-xs text-slate-500 hover:text-slate-200"
              >
                LP に戻る
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-950/90 to-slate-950/98 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

