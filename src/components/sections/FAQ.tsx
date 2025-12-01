"use client";

import { SectionWrapper } from "@/components/layout/SectionWrapper";
import { useLanguage } from "@/lib/language";

type FaqItem = {
  question: string;
  answer: string;
};

/**
 * FAQ セクション
 * よくある質問をいくつか仮埋めする。
 */
export const FAQSection: React.FC = () => {
  const { language } = useLanguage();

  const faqs: FaqItem[] =
    language === "ja"
      ? [
          {
            question: "Q. インフルエンサー登録に審査はありますか？",
            answer:
              "現在は招待制で、一部のインフルエンサー / クリエイターの方を中心にご案内しています。今後は審査フローを設けつつ、順次開放予定です。",
          },
          {
            question: "Q. フォロワー数が少なくても参加できますか？",
            answer:
              "はい、参加できます。フォロワー規模よりも、コミュニケーションの質や継続的な取り組みを重視しています。",
          },
          {
            question: "Q. 報酬の支払いタイミングはいつですか？",
            answer:
              "詳細は今後の仕様確定となりますが、基本的には一定期間ごとの締め・支払いを予定しています。ダッシュボードから獲得報酬額をいつでも確認できます。",
          },
          {
            question: "Q. 企業側に固定費や初期費用は発生しますか？",
            answer:
              "初期費用・月額固定費ともに無料です。売上が発生した際にのみ、売上の一部を成果報酬としてシェアいただく形になります。",
          },
          {
            question: "Q. 不正な購入や自己購入があった場合はどうなりますか？",
            answer:
              "Fraud Radar による自動検知と、運営側でのモニタリングにより、明らかな不正が疑われる取引は報酬対象外とさせていただく場合があります。",
          },
          {
            question: "Q. いつ正式リリースされますか？",
            answer:
              "正式リリースは完了しています（現在は招待制）。ユーザーフィードバックをもとに、段階的に機能を拡充していきます。",
          },
        ]
      : [
          {
            question: "Q. Do you review creators before they can join?",
            answer:
              "Currently, we operate on an invitation basis with a limited set of influencers and creators. Over time, we’ll introduce a review flow and open up more broadly.",
          },
          {
            question: "Q. Can I join even if my follower count is small?",
            answer:
              "Yes. We care more about the quality of your relationship with followers and your consistency than pure follower count.",
          },
          {
            question: "Q. When are rewards paid out?",
            answer:
              "Details are still being finalized, but we plan to operate on periodic payout cycles. You’ll always be able to see your accrued rewards in the dashboard.",
          },
          {
            question: "Q. Are there any fixed costs for brands?",
            answer:
              "There are no setup or monthly fees. You only share a portion of revenue when sales actually happen.",
          },
          {
            question: "Q. What happens if there’s fraud or self-purchasing?",
            answer:
              "Fraud Radar and our operations team monitor suspicious behavior. Transactions that appear clearly fraudulent may be excluded from rewards.",
          },
          {
            question: "Q. When will the full product launch?",
            answer:
              "The product is officially released (currently invitation-based). We’re using user feedback to shape the roadmap and roll out features step by step.",
          },
        ];

  return (
    <SectionWrapper id="faq" variant="neutral">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.28em] text-slate-400">
            FAQ
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            FAQ
          </h2>
        </div>

        <div className="space-y-3 text-sm text-slate-100">
          {faqs.map((item) => (
            <div
              key={item.question}
              className="rounded-2xl border border-white/10 bg-black/70 p-4"
            >
              <p className="text-[13px] font-semibold text-white">
                {item.question}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-200">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};


