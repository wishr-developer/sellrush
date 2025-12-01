"use client";

type Props = {
  activeProductsCount: number;
  averageCommissionRate: number;
  topEarningExample: number;
};

/**
 * 統計セクション（実績ブロック）
 * 販売可能商品数、平均報酬率、トップ販売者報酬例
 */
export const StatsSection: React.FC<Props> = ({
  activeProductsCount,
  averageCommissionRate,
  topEarningExample,
}) => {
  const avgRate = Math.round(averageCommissionRate * 100) || 25;

  return (
    <section className="border-y border-slate-900 bg-slate-950/70 px-4 py-8 md:px-8 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-3">
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <div className="rounded-2xl border border-slate-800 bg-black/70 p-4">
            <div className="text-xs text-slate-400 mb-1">
              現在販売可能な商品
            </div>
            <div className="text-2xl font-semibold">
              {activeProductsCount.toLocaleString()}
              <span className="ml-1 text-base text-slate-400">件</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              データで選ばれたアクティブな商品だけを掲載。
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-black/70 p-4">
            <div className="text-xs text-slate-400 mb-1">平均報酬率</div>
            <div className="text-2xl font-semibold">
              {avgRate}
              <span className="ml-1 text-base text-slate-400">%</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              一般的なアフィリエイトより高めの水準を目指しています。
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-black/70 p-4">
            <div className="text-xs text-slate-400 mb-1">
              トップ販売者の月間報酬例
            </div>
            <div className="text-2xl font-semibold">
              ¥{topEarningExample.toLocaleString()}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              バトルに継続参加しているインフルエンサーの一例です。
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          ※ 表示されている数値はβ版での運用実績・想定値に基づく参考情報です。
        </p>
      </div>
    </section>
  );
};

