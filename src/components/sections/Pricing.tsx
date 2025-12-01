"use client";

import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { useLanguage } from "@/lib/language";

/**
 * PRICING セクション
 * インフルエンサー向け・ブランド向けの料金形態を2カラムのカードで表示する。
 */
export const PricingSection: React.FC = () => {
  const { language } = useLanguage();

  return (
    <SectionWrapper id="pricing" variant="neutral">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.28em] text-slate-400">
            PRICING
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Pricing
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/12 bg-black/70 p-5 text-sm text-slate-100 shadow-[0_20px_55px_rgba(0,0,0,0.9)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
              FOR INFLUENCERS
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              {language === "ja" ? "インフルエンサー向け" : "For Influencers"}
            </h3>
            <ul className="mt-4 space-y-2 text-[13px] text-slate-200">
              {language === "ja" ? (
                <>
                  <li>・登録無料</li>
                  <li>・プラットフォーム利用料 0円</li>
                  <li>・報酬は、売上発生時のみ支払い</li>
                </>
              ) : (
                <>
                  <li>Free to join</li>
                  <li>No platform fee</li>
                  <li>Payouts only when sales occur</li>
                </>
              )}
            </ul>
          </div>

          <div className="rounded-3xl border border-white/12 bg-black/70 p-5 text-sm text-slate-100 shadow-[0_20px_55px_rgba(0,0,0,0.9)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">
              FOR BRANDS
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              {language === "ja" ? "ブランド / 企業向け" : "For Brands & D2C"}
            </h3>
            <ul className="mt-4 space-y-2 text-[13px] text-slate-200">
              {language === "ja" ? (
                <>
                  <li>・初期費用 0円</li>
                  <li>・月額固定費 0円（現在は招待制）</li>
                  <li>・売上発生時のみ、売上の一部を成果報酬として分配</li>
                </>
              ) : (
                <>
                  <li>No setup fee</li>
                  <li>No monthly fee (invitation-based access)</li>
                  <li>Share a portion of revenue only when sales are made</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          {language === "ja"
            ? "今後は、機能に応じた月額＋テイクレートのプランも提供予定です。"
            : "In the future, we plan to offer subscription tiers combined with take rates based on feature sets."}
        </p>
      </div>
    </SectionWrapper>
  );
};


