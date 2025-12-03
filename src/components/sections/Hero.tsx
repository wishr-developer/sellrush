"use client";

import { motion } from "framer-motion";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { CountUpText } from "@/components/common/CountUpText";
import { useLanguage } from "@/lib/language";
import { copy, t } from "@/lib/copy";
import { getLandingArenaHighlight } from "@/lib/arena/landing-mock";

type HeroProps = {
  onOpenEarlyAccess?: () => void;
};

/**
 * HEROセクション
 * 背景動画とダークオーバーレイの上に、キャッチコピーとダッシュボード風カードを重ねて表示する。
 */
export const HeroSection: React.FC<HeroProps> = ({ onOpenEarlyAccess }) => {
  const { language } = useLanguage();
  const c = copy.hero;
  const d = copy.hero.dashboard;
  
  // Landing Page 用の Arena ハイライト情報を取得
  // MVP ではモックデータを使用。将来的には実データに差し替え可能
  const arenaHighlight = getLandingArenaHighlight();

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <SectionWrapper id="hero" variant="hero" className="items-stretch">
      {/* 背景レイヤー
       * 以前は /videos/hero-loop.mp4 を再生していたが、
       * 実ファイルが存在せず 404 が発生していたため、
       * 本番安定性を優先して静的グラデーション背景のみに変更。
       */}
      <div className="pointer-events-none absolute inset-0 -z-20">
        <div className="h-full w-full bg-black" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/80 to-black/95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(251,146,60,0.16),_transparent_60%)]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center gap-10 md:flex-row md:items-center">
        {/* 左カラム：コピー */}
        <div className="flex-1 space-y-6">
          {/* 1. 見出し系 */}
          <motion.p
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-200"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.6, once: false }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            {t(c.label, language)}
          </motion.p>

          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.6, once: false }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
          >
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl lg:text-[40px]">
              {t(c.titleMain, language)}
            </h1>
            <p className="text-[13px] font-semibold uppercase tracking-[0.32em] text-slate-300">
              {t(c.subtitleKicker, language)}
            </p>
          </motion.div>

          {/* 2. サブコピー */}
          <motion.p
            className="max-w-xl text-sm leading-relaxed text-slate-100 md:text-[15px]"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.6, once: false }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          >
            {t(c.body, language)}
          </motion.p>

          {/* 3. CTAボタン群 */}
          <motion.div
            className="flex flex-col gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.6, once: false }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
          >
            <button
              type="button"
              onClick={
                onOpenEarlyAccess
                  ? () => onOpenEarlyAccess()
                  : () => handleScrollTo("influencers")
              }
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black shadow-[0_18px_40px_rgba(15,23,42,0.85)] transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              {t(c.ctaPrimary, language)}
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo("brands")}
              className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t(c.ctaSecondary, language)}
            </button>
          </motion.div>

          {/* 4. 補足テキスト */}
          <motion.p
            className="text-[11px] text-slate-300"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.6, once: false }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.55 }}
          >
            {t(c.note, language)}
          </motion.p>
        </div>

        {/* 右カラム：ダッシュボード風カード */}
        <motion.div
          className="flex-1 w-full md:w-auto"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
        >
          <div className="relative mx-auto flex max-w-md w-full overflow-x-auto md:overflow-visible pb-2">
            <div className="min-w-[280px] max-w-full md:max-w-md origin-top scale-[0.94] md:scale-100">
              {/* メインパネル */}
              <motion.div
                className="rounded-3xl border border-white/15 bg-black/60 p-4 shadow-[0_26px_70px_rgba(0,0,0,0.9)] backdrop-blur-xl"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.5, once: false }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              >
                <div className="mb-3 flex items-center justify-between text-[11px] text-slate-200">
                  <span className="font-medium tracking-[0.18em] uppercase">
                    {t(d.title, language)}
                  </span>
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[10px] text-slate-300">
                      {t(d.activeBattlesLabel, language)}
                    </p>
                    <CountUpText
                      from={3}
                      to={arenaHighlight.activeBattles}
                      durationMs={900}
                      className="mt-1 text-sm font-semibold text-white"
                    />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[10px] text-slate-300">
                      {t(d.creatorsLabel, language)}
                    </p>
                    <CountUpText
                      from={40}
                      to={arenaHighlight.activeCreators}
                      durationMs={1000}
                      suffix="+"
                      className="mt-1 text-sm font-semibold text-white"
                    />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[10px] text-slate-300">
                      {t(d.gmv24hLabel, language)}
                    </p>
                    <CountUpText
                      from={80}
                      to={80 + arenaHighlight.gmv24hChange}
                      durationMs={1100}
                      prefix="+"
                      suffix="%"
                      className="mt-1 text-sm font-semibold text-emerald-300"
                    />
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-slate-400">
                  {t(d.noteMock, language)}
                </p>
              </motion.div>

              {/* サブパネル群 */}
              <motion.div
                className="ml-6 flex flex-col gap-2"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.5, once: false }}
                transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
              >
                <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-black/70 px-4 py-3 text-[11px] text-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400">
                      {t(d.currentRankLabel, language)}
                    </p>
                    <p className="text-sm font-semibold text-white">
                      #{getLandingArenaHighlight().currentRank} / {getLandingArenaHighlight().tournamentName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">
                      {t(d.estRewardLabel, language)}
                    </p>
                    <p className="text-sm font-semibold text-amber-300">
                      ¥{getLandingArenaHighlight().estimatedReward.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-[11px] text-emerald-100">
                  <p>{arenaHighlight.hotMessage}</p>
                  <CountUpText
                    from={18}
                    to={18 + arenaHighlight.clickRateChange}
                    durationMs={900}
                    prefix="+"
                    suffix="%"
                    className="text-[10px] font-semibold"
                    decimals={0}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
};


