"use client";

import { motion } from "framer-motion";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { CountUpText } from "@/components/common/CountUpText";
import { useLanguage } from "@/lib/language";
import { copy, t } from "@/lib/copy";

/**
 * INFLUENCERS セクション
 * インフルエンサー / クリエイターに向けたベネフィットとダッシュボード風モックを表示する。
 */
export const InfluencersSection: React.FC = () => {
  const { language } = useLanguage();
  const c = copy.influencers;

  return (
    <SectionWrapper id="influencers" variant="violet">
      <div className="grid gap-10 md:grid-cols-[1.1fr,1.1fr] md:items-center">
        <div className="space-y-5">
          {/* 1. 見出し */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.5, once: false }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="text-xs font-semibold tracking-[0.28em] text-violet-300">
              {t(c.label, language)}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {t(c.title, language)}
            </h2>
          </motion.div>

          {/* 2. サブコピー */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.5, once: false }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="space-y-3"
          >
            <p className="text-sm leading-relaxed text-slate-100 md:text-[15px]">
              {t(c.leadArena, language)}
            </p>
            <p className="text-sm leading-relaxed text-slate-100 md:text-[15px]">
              {t(c.lead1, language)}
            </p>
            <p className="text-sm leading-relaxed text-slate-100 md:text-[15px]">
              {t(c.lead2, language)}
            </p>
          </motion.div>

          {/* 3. ベネフィットリスト */}
          <motion.ul
            className="mt-4 space-y-2 text-[13px] text-slate-200"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.5, once: false }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
          >
            {c.benefits.map((benefit) => (
              <li key={benefit.ja} className="flex gap-2">
                <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-violet-300" />
                <span>{t(benefit, language)}</span>
              </li>
            ))}
          </motion.ul>
        </div>

        {/* ダッシュボード風モック */}
        <motion.div
          className="relative mx-auto flex max-w-md flex-col gap-3"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.5, once: false }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
        >
          <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="relative rounded-3xl border border-white/12 bg-black/70 p-4 text-[11px] text-slate-100 shadow-[0_22px_60px_rgba(0,0,0,0.9)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold tracking-[0.18em] uppercase">
                {t(c.dashboard.title, language)}
              </span>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                {t(c.dashboard.badge, language)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[10px] text-slate-300">
                  {t(c.dashboard.todayRevenueLabel, language)}
                </p>
                <CountUpText
                  from={8000}
                  to={32400}
                  durationMs={900}
                  prefix="¥"
                  className="mt-1 text-sm font-semibold text-white"
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[10px] text-slate-300">
                  {t(c.dashboard.estRewardLabel, language)}
                </p>
                <CountUpText
                  from={2000}
                  to={9720}
                  durationMs={950}
                  prefix="¥"
                  className="mt-1 text-sm font-semibold text-emerald-300"
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[10px] text-slate-300">
                  {t(c.dashboard.currentRankLabel, language)}
                </p>
                <span className="mt-1 text-sm font-semibold text-white">
                  #12
                </span>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-slate-400">
              {t(c.dashboard.summaryNote, language)}
            </p>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
};


