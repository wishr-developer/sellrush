"use client";

/**
 * SELL RUSHとは何か（販売×競技）
 */
export const ArenaAboutSection: React.FC = () => {
  return (
    <section className="py-20 px-4 md:px-8 lg:px-16 bg-black text-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-[11px] text-slate-300 mb-4">
            公式アリーナ
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              販売をスポーツにする
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            SELL RUSHは、単なるECでもアフィリエイトでもありません。
            <br />
            データで選ばれた商品で、フォロワーと共に勝利を目指す競技プラットフォームです。
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-16">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8 hover:border-blue-500/30 transition-all">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold mb-3">販売バトル</h3>
            <p className="text-slate-300 leading-relaxed">
              カテゴリ別の販売バトルに参加し、リアルタイムでランキングを競います。
              トップに立つことで、より多くの報酬と名誉を獲得できます。
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8 hover:border-purple-500/30 transition-all">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-2xl font-bold mb-3">データ駆動</h3>
            <p className="text-slate-300 leading-relaxed">
              Supabaseのリアルタイムデータから、売れる可能性の高い商品だけを厳選。
              あなたの直感とデータを組み合わせて、最適な商品を選びましょう。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

