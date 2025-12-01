"use client";

import { motion } from "framer-motion";
import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { useLanguage } from "@/lib/language";
import { copy, t } from "@/lib/copy";

/**
 * EASY TO START セクション
 * 誰でも始めやすい「販売ゲーム」であることを、テキスト＋4枚のカードで説明する。
 */
export const EasyToStartSection: React.FC = () => {
  const { language } = useLanguage();
  const c = copy.easy;
  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 0.1 + index * 0.08, ease: "easeOut" },
    }),
  };

  return (
    <SectionWrapper id="easy" variant="cyan">
      <div className="grid gap-10 md:grid-cols-[1.1fr,1.2fr] md:items-center">
        <div className="space-y-5">
          {/* 1. 見出し */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.5, once: false }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="text-xs font-semibold tracking-[0.28em] text-sky-300">
              {t(c.label, language)}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {t(c.title, language)}
            </h2>
          </motion.div>

          {/* 2. サブコピー */}
          <motion.p
            className="text-sm leading-relaxed text-slate-100 md:text-[15px]"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.5, once: false }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          >
            {t(c.body, language)}
          </motion.p>

          <p className="text-[11px] text-slate-400">{t(c.note, language)}</p>
        </div>

        {/* 3. カード群（UI） */}
        <div className="grid gap-4 sm:grid-cols-2">
          {c.cards.map((card, index) => (
            <motion.div
              key={card.title.ja}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/50 p-4 text-sm text-slate-100 shadow-[0_18px_40px_rgba(15,23,42,0.8)]"
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ amount: 0.4, once: false }}
              custom={index}
            >
              <div className="mb-3">
                <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/25 text-[11px] text-sky-200">
                  {index + 1}
                </div>
                <h3 className="text-sm font-semibold text-white">
                  {t(card.title, language)}
                </h3>
              </div>
              <p className="text-[13px] leading-relaxed text-slate-200">
                {t(card.body, language)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};


