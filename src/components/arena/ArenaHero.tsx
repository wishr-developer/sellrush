"use client";

import { useRouter } from "next/navigation";

/**
 * 公式サイト ヒーローセクション
 * Pinterestのインスピレーションサイト風の、中央にカードが浮かぶレイアウト
 */
export const ArenaHero: React.FC = () => {
  const router = useRouter();

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-black via-slate-950 to-black">
      {/* 背景グリッド + グロー */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(129,140,248,0.16),_transparent_60%)]" />
        <div className="absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_top,_black,_transparent_70%)]">
          <div className="h-full w-full bg-[linear-gradient(to_right,_rgba(148,163,184,0.18)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(148,163,184,0.18)_1px,_transparent_1px)] bg-[size:80px_80px]" />
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16 pt-28 md:flex-row md:items-center md:gap-12 md:px-8 lg:px-10">
        {/* 左カラム: コピー & CTA */}
        <div className="md:w-1/2 space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            Data-driven social selling
          </p>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-[52px]">
              売る者が、
              <br />
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                主役になる。
              </span>
            </h1>
            <p className="text-[13px] font-semibold uppercase tracking-[0.32em] text-slate-400">
              SELL RUSH OFFICIAL ARENA PLATFORM
            </p>
          </div>

          <p className="max-w-xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
            データで選ばれた「売れる商品」だけを、今日からあなたのフォロワーに販売。
            仕入れ不要で、リンクを発行して紹介するだけ。成果が出た分だけ、高い報酬が入ります。
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={() => router.push("/login")}
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-black shadow-[0_18px_45px_rgba(15,23,42,0.75)] transition-transform hover:-translate-y-0.5 hover:bg-slate-100"
            >
              ログイン
            </button>
            <button
              onClick={() => router.push("/login?mode=signup")}
              className="inline-flex items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/10 px-7 py-3 text-sm font-semibold text-sky-200 backdrop-blur transition hover:border-sky-300/60 hover:bg-sky-500/20"
            >
              販売に参加する
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">
              インフルエンサー特化
            </span>
            <span>仕入れリスクなし / 完全成果報酬型</span>
          </div>
        </div>

        {/* 右カラム: フローティングカード */}
        <div className="mt-10 md:mt-0 md:w-1/2">
          <div className="relative mx-auto max-w-md">
            {/* メインカード */}
            <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/90 to-slate-900/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.95)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Live selling arena
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    今、販売バトルが行われている商品
                  </p>
                </div>
                <div className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-300">
                  Online • 124 creators
                </div>
              </div>

              <div className="space-y-3">
                {["美容セラム", "ワイヤレスイヤホン", "ナイトリカバリーサプリ"].map(
                  (label, index) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-3.5 py-3 transition hover:border-sky-400/40"
                    >
                      <div>
                        <p className="text-[11px] font-semibold text-slate-100">
                          #{index + 1} {label}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {Math.floor(Math.random() * 40 + 20)}人が同時に販売中
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold text-emerald-400">
                          +{(Math.random() * 24 + 6).toFixed(1)}% GMV
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          報酬率 25〜35%
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-3 text-[11px] text-slate-300">
                <div>
                  <p className="text-[10px] text-slate-500">現在の販売可能商品</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">120+ 件</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">平均報酬率</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">28%</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">トップ販売者 月報酬</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">¥150,000+</p>
                </div>
              </div>

              <p className="mt-3 text-[10px] text-slate-500">
                ※ 表示値はβ版での参考データです。実際の報酬は販売実績に応じて変動します。
              </p>
            </div>

            {/* デコレーションオブジェクト */}
            <div className="pointer-events-none absolute -left-10 -top-10 h-24 w-24 rounded-3xl border border-sky-500/30 bg-sky-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-8 bottom-12 h-20 w-20 rounded-full border border-violet-500/30 bg-violet-500/10 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

