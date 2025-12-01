"use client";

import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { useLanguage } from "@/lib/language";

/**
 * BRANDS セクション
 * ブランド / D2C / スタートアップ向けのメリットをカード形式で紹介する。
 */
export const BrandsSection: React.FC = () => {
  const { language } = useLanguage();

  const benefits =
    language === "ja"
      ? [
          {
            title: "無駄な広告費ゼロ",
            body: "初期費用0円・月額固定費0円。売上が発生したときだけ、売上の一部を成果報酬としてシェアします。",
          },
          {
            title: "本当に売れるインフルエンサーだけが残る",
            body: "成果報酬設計だからこそ、継続的に売上を出せるプレイヤーが自然と残り、パフォーマンスベースの関係が築けます。",
          },
          {
            title: "不正検知（Fraud Radar）でブランドを守る",
            body: "自己購入や不自然な注文パターンを自動検知。ブランド毀損や不正報酬を未然に防ぎます。",
          },
        ]
      : [
          {
            title: "Zero wasted ad spend",
            body: "No setup fees, no monthly subscription. You only share a portion of revenue when sales are generated.",
          },
          {
            title: "Only real performers remain",
            body: "Because everything is performance-based, creators who consistently drive sales naturally stay, building a results-first relationship.",
          },
          {
            title: "Fraud Radar to protect your brand",
            body: "Automatically detects self-purchases and suspicious order patterns, helping prevent brand damage and unfair payouts.",
          },
        ];

  return (
    <SectionWrapper id="brands" variant="amber">
      <div className="grid gap-10 md:grid-cols-[1.05fr,1.1fr] md:items-center">
        <div className="space-y-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-amber-300">
            FOR BRANDS & D2C
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            For Brands & D2C
          </h2>
          <p className="text-sm leading-relaxed text-slate-100 md:text-[15px]">
            {language === "ja"
              ? "広告費を先払いしない、成果報酬だけの新しい販路。"
              : "A new performance-only channel without upfront ad spend."}
          </p>
          <p className="text-sm leading-relaxed text-slate-100 md:text-[15px]">
            {language === "ja"
              ? "初期費用0円・月額固定費0円。売上が発生したときだけ、売上の一部を成果報酬として分配します。「誰が」「どの商品を」「どのくらい売っているか」がダッシュボードで一目瞭然です。不正検知（Fraud Radar）により、自己購入や不自然な注文を自動でチェックします。"
              : "Zero setup fee and zero monthly fee. Revenue is shared only when sales occur. A live dashboard shows who is selling which products and how much. Fraud Radar automatically flags self-purchases and abnormal patterns."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-slate-100 shadow-[0_18px_40px_rgba(0,0,0,0.9)]"
            >
              <h3 className="mb-2 text-sm font-semibold text-white">
                {benefit.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-slate-200">
                {benefit.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};


