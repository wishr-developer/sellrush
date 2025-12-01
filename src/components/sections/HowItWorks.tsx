"use client";

import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { useLanguage } from "@/lib/language";

/**
 * HOW IT WORKS セクション
 * 3ステップのフローをタイムライン的なレイアウトで説明する。
 */
export const HowItWorksSection: React.FC = () => {
  const { language } = useLanguage();

  const steps =
    language === "ja"
      ? [
          {
            label: "1. 参加",
            detail:
              "インフルエンサーは商品を選び、紹介リンクを発行。企業は商品情報・販売条件を登録します。",
          },
          {
            label: "2. 販売",
            detail:
              "フォロワーがリンクから商品を購入。売上データがリアルタイムに両者のダッシュボードへ流れ込みます。",
          },
          {
            label: "3. 分配",
            detail:
              "売上を 企業40% / インフルエンサー30% / プラットフォーム30% のように自動分配。UI上で明確に確認できます。",
          },
        ]
      : [
          {
            label: "1. Join",
            detail:
              "Creators pick products and generate their unique links. Brands register product details and commercial terms.",
          },
          {
            label: "2. Sell",
            detail:
              "Followers purchase through those links, and sales data flows in real time into both dashboards.",
          },
          {
            label: "3. Split",
            detail:
              "Revenue is automatically split (e.g. 40% brand / 30% creator / 30% platform), with the breakdown clearly visible in the UI.",
          },
        ];

  return (
    <SectionWrapper id="how-it-works" variant="neutral">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.28em] text-slate-400">
            HOW IT WORKS
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            How it Works
          </h2>
        </div>

        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.label}
              className="relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-slate-100"
            >
              {index < steps.length - 1 && (
                <span className="pointer-events-none absolute right-[-16px] top-1/2 hidden h-px w-8 bg-gradient-to-r from-slate-500/70 to-transparent md:block" />
              )}
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25 text-[11px]">
                  {index + 1}
                </span>
                <h3 className="text-sm font-semibold">{step.label}</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-slate-200">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};


