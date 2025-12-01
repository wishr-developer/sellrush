"use client";

import { TrendingUp, Building2, Users, Zap } from "lucide-react";

/**
 * 成果報酬・モデル説明セクション
 * 40/30/30モデルの説明
 */
export const RevenueModelSection: React.FC = () => {
  const modelParts = [
    {
      percentage: "40%",
      label: "企業",
      description: "商品提供・在庫管理",
      icon: Building2,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
    },
    {
      percentage: "30%",
      label: "インフルエンサー",
      description: "販売・マーケティング",
      icon: Users,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
    },
    {
      percentage: "30%",
      label: "プラットフォーム",
      description: "システム運営・サポート",
      icon: Zap,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
    },
  ];

  return (
    <section className="px-4 py-16 md:px-8 lg:px-16 bg-gradient-to-b from-black to-slate-950">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <p className="inline-flex items-center rounded-full border border-slate-800 bg-black/60 px-3 py-1 text-[11px] text-slate-300 mb-4">
            完全成果報酬モデル
          </p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            固定費なし。売れた分だけ
            <br />
            <span className="text-sky-400">40 / 30 / 30 で自動分配</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            SELL RUSHは、売上が発生した時だけ報酬が分配される完全成果報酬型プラットフォームです。
            初期費用・月額費用は一切かかりません。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {modelParts.map((part, idx) => {
            const Icon = part.icon;
            return (
              <div
                key={part.label}
                className={`relative rounded-2xl border ${part.borderColor} ${part.bgColor} p-6 hover:scale-105 transition-transform duration-300`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${part.bgColor} border ${part.borderColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${part.color}`} />
                  </div>
                  <div>
                    <div className={`text-3xl font-bold ${part.color}`}>
                      {part.percentage}
                    </div>
                    <div className="text-sm text-slate-300 font-medium">
                      {part.label}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {part.description}
                </p>
                {idx === 1 && (
                  <div className="absolute -top-2 -right-2 bg-emerald-500 text-black text-[10px] font-bold px-2 py-1 rounded-full">
                    あなたの報酬
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900/50 border border-slate-800 rounded-full">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-slate-300">
              例: 10,000円の商品が売れた場合、あなたの報酬は
              <span className="text-emerald-400 font-bold"> 3,000円</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

