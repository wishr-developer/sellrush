"use client";

import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { useLanguage } from "@/lib/language";

/**
 * FEATURES セクション
 * Gamified UI / Tournament System / Fraud Radar の3つの特徴をカードで紹介する。
 */
export const FeaturesSection: React.FC = () => {
  const { language } = useLanguage();

  const features =
    language === "ja"
      ? [
          {
            title: "Gamified UI",
            body: "トレーディング端末のようなコマンドセンターUIで、売上・クリック・コンバージョン・ランキングをリアルタイムで監視できます。",
          },
          {
            title: "Tournament System",
            body: "商品ごと・期間ごとに販売バトルを開催。上位インフルエンサーに賞金・ボーナス・称号を付与し、モチベーションを継続的に高めます。",
          },
          {
            title: "Fraud Radar",
            body: "自己購入や不自然な注文パターンを自動検知。企業のブランド毀損や不正報酬を防ぎ、公平なバトル環境を維持します。",
          },
        ]
      : [
          {
            title: "Gamified UI",
            body: "A command-center experience inspired by trading terminals, monitoring revenue, clicks, conversions, and rankings in real time.",
          },
          {
            title: "Tournament System",
            body: "Host product- and time-based sales tournaments, rewarding top creators with prizes, bonuses, and titles to keep them engaged.",
          },
          {
            title: "Fraud Radar",
            body: "Automatically detects self-purchases and abnormal patterns to prevent brand damage and unfair payouts.",
          },
        ];

  return (
    <SectionWrapper id="features" variant="neutral">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.28em] text-slate-400">
            FEATURES
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Features
          </h2>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/70 p-4 text-sm text-slate-100 shadow-[0_18px_40px_rgba(0,0,0,0.9)]"
            >
              <h3 className="mb-2 text-sm font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-slate-200">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};


