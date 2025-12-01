"use client";

import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { useLanguage } from "@/lib/language";

/**
 * PRODUCT セクション（What is SELL RUSH?）
 * プラットフォームの正体を3カラムの説明で伝える。
 */
export const ProductSection: React.FC = () => {
  const { language } = useLanguage();

  const items =
    language === "ja"
      ? [
          {
            title: "販売バトル形式のマーケットプレイス",
            body: "商品ごとに期間限定の「販売バトル」を開催。インフルエンサー同士がパフォーマンスで競い合う、新感覚のマーケットプレイスです。",
          },
          {
            title: "売上とランキングがリアルタイムで見えるダッシュボード",
            body: "クリック・コンバージョン・売上・ランキングを、トレーディング端末のようなダッシュボードで一元管理できます。",
          },
          {
            title: "売れた分だけ三者で分配される完全成果報酬",
            body: "売上が発生したときだけ、企業・インフルエンサー・プラットフォームで売上を分配。無駄な広告費が発生しにくい設計です。",
          },
        ]
      : [
          {
            title: "Battle-driven marketplace",
            body: "Run time-limited sales battles for each product, where creators compete on performance in a gamified marketplace.",
          },
          {
            title: "Live performance dashboard",
            body: "Track clicks, conversions, revenue, and rankings in real time through a trading-terminal–inspired dashboard.",
          },
          {
            title: "Pure performance-based economics",
            body: "Revenue is split only when sales happen, between brands, creators, and the platform—no wasted ad spend.",
          },
        ];

  return (
    <SectionWrapper id="product" variant="neutral">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.28em] text-slate-400">
            PRODUCT
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            What is SELL RUSH?
          </h2>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-100 md:text-[15px]">
          {language === "ja"
            ? "SELL RUSHは、eスポーツの「競技性」と、金融トレーディングの「リアルタイム性」をかけ合わせた、完全成果報酬型のソーシャルセリング・プラットフォームです。売ることそのものを、一つの競技として楽しめるようにデザインされています。"
            : "SELL RUSH combines the competitiveness of esports with the real-time nature of trading. It’s a fully performance-based social selling platform, designed so that “selling” itself feels like a sport."}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-slate-100 shadow-[0_18px_40px_rgba(0,0,0,0.85)]"
            >
              <h3 className="mb-2 text-sm font-semibold text-white">
                {item.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-slate-200">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};


