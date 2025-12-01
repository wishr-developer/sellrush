"use client";

import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { useLanguage } from "@/lib/language";

/**
 * ROADMAP セクション
 * プロダクトのフェーズをシンプルなタイムラインで紹介する。
 */
export const RoadmapSection: React.FC = () => {
  const { language } = useLanguage();

  const phases =
    language === "ja"
      ? [
          {
            title: "Phase 1 – Initial Release",
            body: "コアとなる販売バトル・ダッシュボード・報酬分配まわりの機能を構築し、招待制でインフルエンサー / ブランドからフィードバックを収集。",
          },
          {
            title: "Phase 2 – 決済機能・正式ローンチ",
            body: "決済連携や運営画面を拡充し、正式版として一般公開。キャンペーン機能や大会モードも段階的に展開します。",
          },
          {
            title: "Phase 3 – 大会スポンサー / PB商品の開発",
            body: "大会スポンサー枠の提供や、SELL RUSH発のPB商品開発など、新しいマネタイズとコミュニティ施策を推進していきます。",
          },
        ]
      : [
          {
            title: "Phase 1 – Initial Release",
            body: "Build the core experience around sales battles, dashboards, and revenue split, and gather feedback from invited creators and brands.",
          },
          {
            title: "Phase 2 – Payments & Public Launch",
            body: "Integrate payments and admin tools, then roll out the official launch with campaign and tournament modes.",
          },
          {
            title: "Phase 3 – Sponsors & Original Products",
            body: "Introduce tournament sponsorships and develop original products born from the SELL RUSH community.",
          },
        ];

  return (
    <SectionWrapper id="roadmap" variant="neutral">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.28em] text-slate-400">
            ROADMAP
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Roadmap
          </h2>
        </div>

        <ol className="mt-4 space-y-4 text-sm text-slate-100">
          {phases.map((phase, index) => (
            <li key={phase.title} className="flex gap-3">
              <div className="mt-1 flex flex-col items-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25 text-[11px]">
                  {index + 1}
                </span>
                {index < phases.length - 1 && (
                  <span className="mt-1 h-10 w-px bg-gradient-to-b from-slate-500/70 to-transparent" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {phase.title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-200">
                  {phase.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </SectionWrapper>
  );
};


