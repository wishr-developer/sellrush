"use client";

import { TrendingUp } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { copy, t } from "@/lib/copy";

const isProduction = process.env.NODE_ENV === "production";
const adminLoginUrl =
  process.env.NEXT_PUBLIC_ADMIN_LOGIN_URL ?? "http://localhost:3003/login";

/**
 * フッター
 * FINAL SCENE の後に静かに配置される、映画のエンドロール的なフッター。
 */
export const Footer: React.FC = () => {
  const { language } = useLanguage();
  const c = copy.footer;

  return (
    <footer className="border-t border-white/10 bg-black pb-10 pt-8 text-[11px] text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 md:flex-row md:items-end md:justify-between md:px-8 lg:px-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-slate-800 to-slate-600">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div className="leading-tight">
              <span className="block text-[10px] tracking-[0.3em] text-slate-400">
                SELL RUSH
              </span>
              <span className="block text-[11px] font-semibold tracking-[0.24em] text-slate-100">
                PLATFORM
              </span>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {t(c.tagline, language)}
          </p>
        </div>

        <div className="flex flex-1 flex-wrap gap-8 md:justify-end">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold tracking-[0.26em] text-slate-500">
              {t(c.services, language)}
            </p>
            <div className="mt-1 flex flex-col gap-1">
              <a href="#product" className="hover:text-slate-200">
                {t(c.linkProduct, language)}
              </a>
              <a href="#how-it-works" className="hover:text-slate-200">
                {t(c.linkHowItWorks, language)}
              </a>
              <a href="#brands" className="hover:text-slate-200">
                {t(c.linkForBrands, language)}
              </a>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold tracking-[0.26em] text-slate-500">
              {t(c.legal, language)}
            </p>
            <div className="mt-1 flex flex-col gap-1">
              <button type="button" className="text-left hover:text-slate-200">
                {t(c.linkTerms, language)}
              </button>
              <button type="button" className="text-left hover:text-slate-200">
                {t(c.linkPrivacy, language)}
              </button>
            </div>
          </div>

          {/* Admin 導線: 本番環境では完全に非表示（セキュリティ） */}
          {!isProduction && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold tracking-[0.26em] text-slate-500">
                {t(c.admin, language)}
              </p>
              <div className="mt-1 flex flex-col gap-1">
                {/* 注意: 本番環境では環境変数 NEXT_PUBLIC_ADMIN_LOGIN_URL または適切なドメインを使用すること（デフォルトは開発環境用の localhost） */}
                <a
                  href={adminLoginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-200"
                >
                  {t(c.linkAdminLogin, language)}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-center text-[10px] text-slate-500">
        <p>{t(c.copyright, language)}</p>
      </div>
    </footer>
  );
};


