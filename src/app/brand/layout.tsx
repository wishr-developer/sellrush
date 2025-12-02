import type { ReactNode } from "react";
import { BrandNavigation } from "@/components/layout/BrandNavigation";

/**
 * ブランド用レイアウト
 * 
 * クリエイターダッシュボードとの共通化:
 * - ナビゲーションコンポーネントを使用
 * - レスポンシブ対応
 * 
 * 違い:
 * - メニュー項目が異なる（Brand用メニュー）
 */
export default function BrandLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <BrandNavigation />
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 md:pt-6">
        {/* Main Content */}
        <main className="flex-1 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-950/90 to-slate-950/98 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

