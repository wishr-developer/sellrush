"use client";

/**
 * How it works セクション（3ステップ）
 */
export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      title: "商品を選ぶ",
      desc: "SELL RUSHが選定したカタログから、フォロワーと相性の良い商品を選びます。",
      label: "Step 1",
      highlight: "データで選ばれた売れる商品だけ",
    },
    {
      title: "リンクを発行・投稿",
      desc: "専用リンクを発行し、SNSの投稿やプロフィール、ストーリーズで紹介します。",
      label: "Step 2",
      highlight: "仕入れ不要・在庫リスクゼロ",
    },
    {
      title: "売れた分だけ報酬獲得",
      desc: "売上はリアルタイムでトラッキングされ、成果報酬が自動分配されます。",
      label: "Step 3",
      highlight: "完全成果報酬・固定費なし",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="px-4 py-12 md:px-8 lg:px-16 bg-black"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <p className="inline-flex items-center rounded-full border border-slate-800 bg-black/60 px-3 py-1 text-[11px] text-slate-300 mb-4">
            心理的ハードルゼロ
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            使い方はシンプル、3ステップ
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            複雑な手続きは一切ありません。商品を選んで、リンクを発行して、売れたら報酬が入るだけ。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          {steps.map((s, idx) => (
            <div
              key={s.title}
              className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 hover:border-sky-500/30 hover:bg-slate-900/80 transition-all duration-300"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{s.label}</span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-300 border border-sky-500/30">
                  {idx + 1}
                </span>
              </div>
              <div className="font-bold text-lg mb-2 text-white">{s.title}</div>
              <p className="text-slate-300 text-xs leading-relaxed mb-3">
                {s.desc}
              </p>
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                <span className="text-[10px] text-emerald-400 font-medium">
                  ✓ {s.highlight}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

