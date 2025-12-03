"use client";

import { motion } from "framer-motion";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { useLanguage } from "@/lib/language";

type FinalCTAProps = {
  onOpenEarlyAccess?: () => void;
};

/**
 * FINAL CTA セクション
 * クローズドβへの参加申込を促す締めのセクション。
 * フッター直前の「FINAL SCENE」として、映画のラストカットのような静かな決めを作る。
 */
export const FinalCTASection: React.FC<FinalCTAProps> = ({
  onOpenEarlyAccess,
}) => {
  const { language } = useLanguage();

  return (
    <SectionWrapper id="final-cta" variant="hero">
      <div className="relative mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center text-center">
        <div className="pointer-events-none absolute -inset-x-32 -top-40 -z-10 h-48 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.4),_transparent_70%)]" />
        <div className="pointer-events-none absolute -inset-x-24 -bottom-32 -z-10 h-48 bg-[radial-gradient(circle_at_bottom,_rgba(15,23,42,0.9),_transparent_70%)]" />

        {/* 1. 見出し */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.7, once: false }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <p className="text-[11px] font-semibold tracking-[0.32em] text-slate-400">
            FINAL SCENE
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {language === "ja" ? (
              <>
                あなたの「売る力」を、
                <br />
                競技にしよう。
              </>
            ) : (
              <>
                Turn your ability to sell
                <br />
                into a competitive game.
              </>
            )}
          </h2>
        </motion.div>

        {/* 2. サブコピー */}
        <motion.p
          className="mt-4 max-w-xl text-sm leading-relaxed text-slate-100 md:text-[15px]"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.7, once: false }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
        >
          {language === "ja"
            ? "SELL RUSH は正式リリース中です（現在は招待制）。早期アクセスをご利用いただけます。"
            : "SELL RUSH is now officially released (invitation-based access). Early access is available."}
        </motion.p>

        {/* 3. CTAボタン（テキストから 0.6s 遅れて） */}
        <motion.div
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.7, once: false }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.6 }}
        >
          <button
            type="button"
            onClick={onOpenEarlyAccess}
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-7 py-2.5 text-xs font-semibold tracking-[0.18em] text-black shadow-[0_18px_40px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:bg-slate-50 sm:w-auto"
          >
            JOIN THE ARENA
          </button>
          <button
            type="button"
            onClick={() => {
              // Brand 向けの導線: /brand または /login?mode=brand に遷移
              if (typeof window !== "undefined") {
                window.location.href = "/login?mode=brand";
              }
            }}
            className="inline-flex w-full items-center justify-center rounded-full border border-white/60 bg-black/40 px-7 py-2.5 text-xs font-semibold tracking-[0.18em] text-white transition hover:bg-white/10 sm:w-auto"
          >
            ENTER AS BRAND
          </button>
        </motion.div>
      </div>
    </SectionWrapper>
  );
};


