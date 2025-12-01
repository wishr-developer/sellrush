"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

type SectionVariant = "hero" | "cyan" | "violet" | "amber" | "neutral";

type SectionWrapperProps = {
  /** セクションのアンカーID（ヘッダーやインジケータから参照） */
  id: string;
  /** セクションごとの背景バリエーション */
  variant?: SectionVariant;
  /** 追加のクラス名 */
  className?: string;
  /** セクション内部のコンテンツ */
  children: ReactNode;
};

/**
 * 各シーン（セクション）の共通ラッパーコンポーネント。
 * 100vh 近い高さ・ダークグラデーション背景・ノイズレイヤー・
 * Framer Motion を使ったフェードインアニメーションを統一的に付与する。
 */
export const SectionWrapper: React.FC<SectionWrapperProps> = ({
  id,
  variant = "neutral",
  className,
  children,
}) => {
  const backgroundClass = (() => {
    switch (variant) {
      case "hero":
        return "bg-black";
      case "cyan":
        return "bg-gradient-to-b from-slate-950 via-slate-950 to-black";
      case "violet":
        return "bg-gradient-to-b from-[#0f1020] via-black to-[#05010a]";
      case "amber":
        return "bg-gradient-to-b from-[#1a1208] via-black to-[#050403]";
      case "neutral":
      default:
        return "bg-gradient-to-b from-black via-slate-950 to-black";
    }
  })();

  return (
    <section
      id={id}
      data-section-id={id}
      className={clsx(
        "relative min-h-screen overflow-hidden",
        "flex items-center",
        backgroundClass,
        className
      )}
    >
      {/* 背景グロー＆ノイズ（ゆっくりと動かして“静止画感”を減らす） */}
      <motion.div
        className="pointer-events-none absolute inset-0 -z-10"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="absolute inset-[-10%] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]"
          transition={{ duration: 24, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          animate={{ y: [-10, 6] }}
        />
        <motion.div
          className="absolute inset-[-10%] bg-[radial-gradient(circle_at_bottom,_rgba(251,146,60,0.16),_transparent_55%)]"
          transition={{ duration: 28, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          animate={{ y: [8, -8] }}
        />
        {/* 非常に薄いノイズテクスチャ */}
        <div className="absolute inset-0 opacity-[0.04] mix-blend-soft-light [background-image:linear-gradient(0deg,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:3px_3px]" />
      </motion.div>

      {/* カット切り替え風の暗転オーバーレイ */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-black"
        initial={{ opacity: 1 }}
        whileInView={{ opacity: 0 }}
        viewport={{ amount: 0.4, once: false }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-24 md:px-10 lg:px-12"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ amount: 0.4, once: false }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </section>
  );
};


