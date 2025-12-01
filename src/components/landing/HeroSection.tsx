"use client";

import { useRouter } from "next/navigation";

/**
 * ヒーローセクション
 * キャッチコピー、サブコピー、メインCTA、サブCTA
 */
export const HeroSection: React.FC = () => {
  const router = useRouter();

  return (
    <section className="px-4 md:px-8 lg:px-16 py-12 md:py-20 bg-gradient-to-b from-black via-slate-950 to-black">
      <div className="mx-auto max-w-6xl flex flex-col gap-10 md:flex-row md:items-center">
        <div className="flex-1 space-y-6">
          <p className="inline-flex items-center rounded-full border border-slate-800 bg-black/60 px-3 py-1 text-[11px] text-slate-300">
            データ駆動・完全成果報酬のソーシャルセリング
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
            売れる商品だけを、
            <br />
            <span className="text-sky-400">今すぐフォロワーに販売。</span>
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-xl">
            SELL RUSHは、データで選ばれた"売れやすい商品"だけを集めた販売プラットフォーム。
            仕入れ不要で、販売リンクを発行して紹介するだけで報酬を獲得できます。
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => router.push("/login")}
              className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-black hover:bg-sky-400 transition-colors"
            >
              販売をはじめる
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="text-sm text-slate-300 underline-offset-4 hover:underline"
            >
              仕組みを見る
            </button>
          </div>
          <p className="text-xs text-slate-500">
            固定費なし。売れた分だけ成果報酬が入ります。
          </p>
        </div>

        {/* Live Trading Snapshot - ゲーミフィケーション要素 */}
        <div className="flex-1">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-slate-300 font-medium">Live Trading Snapshot</span>
              </div>
              <span className="px-2 py-1 bg-slate-800 text-[10px] text-slate-400 rounded-full border border-slate-700">β</span>
            </div>
            <div className="space-y-2 text-xs">
              {["美容", "ガジェット", "サプリ"].map((label, i) => {
                const gmvGrowth = (Math.random() * 25 + 5).toFixed(1);
                const isHot = parseFloat(gmvGrowth) > 20;
                return (
                  <div
                    key={label}
                    className={`flex items-center justify-between rounded-xl bg-black/60 px-3 py-2.5 border ${
                      isHot ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-800"
                    } hover:border-sky-500/30 transition-colors`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] text-sky-300 font-medium">
                          #{i + 1} {label}カテゴリ
                        </span>
                        {isHot && (
                          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] rounded-full border border-red-500/30">
                            🔥 HOT
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {Math.floor(Math.random() * 50 + 10)}人のインフルエンサーが販売バトル中
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-[11px] text-emerald-400 font-bold">
                        +{gmvGrowth}% GMV
                      </div>
                      <div className="text-[10px] text-slate-500">
                        報酬率 25〜35%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 text-center">
                ※ リアルタイムデータはβ版での参考値です
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

