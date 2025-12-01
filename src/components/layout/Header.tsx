"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";
import { copy, t } from "@/lib/copy";

type NavItem = {
  label: string;
  targetId: string;
};

const navItems: NavItem[] = [
  { label: "PRODUCT", targetId: "product" },
  { label: "INFLUENCERS", targetId: "influencers" },
  { label: "BRANDS", targetId: "brands" },
  { label: "HOW IT WORKS", targetId: "how-it-works" },
  { label: "PRICING", targetId: "pricing" },
  { label: "ROADMAP", targetId: "roadmap" },
  { label: "FAQ", targetId: "faq" },
];

type HeaderProps = {
  activeSectionId?: string;
  onOpenEarlyAccess?: () => void;
};

export const Header: React.FC<HeaderProps> = ({
  activeSectionId,
  onOpenEarlyAccess,
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLangHint, setShowLangHint] = useState(false);
  const [authState, setAuthState] = useState<
    "loading" | "guest" | "authenticated"
  >("loading");
  const { language, setLanguage } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setAuthState(user ? "authenticated" : "guest");
      } catch (e) {
        console.error(e);
        setAuthState("guest");
      }
    };
    void check();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "sr-lang-hint-shown";
    if (window.localStorage.getItem(key)) return;

    setShowLangHint(true);
    const timer = setTimeout(() => {
      setShowLangHint(false);
      window.localStorage.setItem(key, "1");
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsMobileOpen(false);
  };

  const handleSignInClick = () => {
    setIsMobileOpen(false);
    router.push("/login");
  };

  const handleDashboardClick = () => {
    setIsMobileOpen(false);
    router.push("/dashboard");
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="pointer-events-auto mx-auto mt-3 flex max-w-6xl items-center gap-4 rounded-full border border-white/10 bg-black/40 px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.75)] backdrop-blur-md md:mt-5 md:px-6"
      >
        {/* ロゴ */}
        <button
          type="button"
          onClick={() => handleScrollTo("hero")}
          className="flex items-center gap-2 text-left"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-slate-900 to-slate-700 text-[10px] font-semibold tracking-[0.18em] text-white">
            SR
          </span>
          <div className="leading-tight">
            <span className="block text-[11px] font-medium tracking-[0.32em] text-slate-300">
              SELL
            </span>
            <span className="block text-sm font-semibold tracking-[0.28em] text-white">
              RUSH
            </span>
          </div>
        </button>

        {/* PCナビゲーション */}
        <nav className="hidden flex-1 items-center justify-between text-[11px] font-medium tracking-[0.18em] text-slate-300 md:flex">
          <div className="flex items-center gap-4 lg:gap-5">
            {navItems.map((item) => {
              const isActive = activeSectionId === item.targetId;
              return (
                <button
                  key={item.targetId}
                  type="button"
                  onClick={() => handleScrollTo(item.targetId)}
                  className={`relative px-1 py-1 transition-colors ${
                    isActive ? "text-white" : "text-slate-300"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-1 mx-auto block h-px w-6 rounded-full bg-gradient-to-r from-sky-400 to-emerald-300" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            {/* 言語トグル（PC） */}
            <div className="relative">
              {showLangHint && (
                <div className="pointer-events-none absolute -inset-1 rounded-full bg-sky-500/20 blur-md" />
              )}
              <div className="flex items-center gap-2 text-[10px] tracking-[0.18em]">
                <button
                  type="button"
                  onClick={() => setLanguage("ja")}
                  className={`transition-opacity ${
                    language === "ja"
                      ? "text-white opacity-100"
                      : "text-slate-500 opacity-70 hover:opacity-100"
                  }`}
                >
                  JP
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`transition-opacity ${
                    language === "en"
                      ? "text-white opacity-100"
                      : "text-slate-500 opacity-70 hover:opacity-100"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* 認証状態に応じたボタン（PC） */}
            {authState !== "loading" && (
              <>
                {authState === "guest" ? (
                  <button
                    type="button"
                    onClick={handleSignInClick}
                    className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] tracking-[0.16em] text-slate-100 transition hover:bg-white/5"
                  >
                    {t(copy.navigation.signIn, language)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDashboardClick}
                    className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1.5 text-[11px] tracking-[0.16em] text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
                  >
                    {t(copy.navigation.dashboard, language)}
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={
                onOpenEarlyAccess
                  ? () => onOpenEarlyAccess()
                  : () => handleScrollTo("final-cta")
              }
              className="inline-flex items-center justify-center rounded-full border border-sky-400/60 bg-sky-500/15 px-4 py-2 text-[11px] font-semibold tracking-[0.2em] text-sky-100 transition hover:border-sky-300 hover:bg-sky-500/25"
            >
              GET EARLY ACCESS
            </button>
          </div>
        </nav>

        {/* モバイル：EARLY ACCESS + MENU */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={
              onOpenEarlyAccess
                ? () => onOpenEarlyAccess()
                : () => handleScrollTo("final-cta")
            }
            className="inline-flex items-center justify-center rounded-full border border-sky-400/60 bg-sky-500/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-50 transition hover:border-sky-300 hover:bg-sky-500/30"
          >
            EARLY ACCESS
          </button>
          <button
            type="button"
            onClick={() => setIsMobileOpen((v) => !v)}
            className="rounded-full border border-white/20 bg-black/40 px-2 py-1 text-[11px] font-semibold tracking-[0.18em] text-slate-100"
          >
            MENU
          </button>
        </div>
      </motion.div>

      {/* モバイルメニュー（LANGUAGE を最上部に） */}
      {isMobileOpen && (
        <div className="pointer-events-auto mt-2 w-full bg-black/90 pb-6 pt-4 text-[11px] text-slate-200 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5">
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-[0.26em] text-slate-500">
                LANGUAGE
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1">
                <button
                  type="button"
                  onClick={() => setLanguage("ja")}
                  className={`transition-opacity ${
                    language === "ja"
                      ? "text-white opacity-100"
                      : "text-slate-500 opacity-70 hover:opacity-100"
                  }`}
                >
                  JP
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`transition-opacity ${
                    language === "en"
                      ? "text-white opacity-100"
                      : "text-slate-500 opacity-70 hover:opacity-100"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <button
                  key={item.targetId}
                  type="button"
                  onClick={() => handleScrollTo(item.targetId)}
                  className="text-left tracking-[0.2em] text-slate-200"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* モバイルメニュー内の認証ボタン */}
            {authState !== "loading" && (
              <div className="mt-4 flex flex-col gap-2">
                {authState === "guest" ? (
                  <button
                    type="button"
                    onClick={handleSignInClick}
                    className="w-full rounded-full border border-white/25 bg-black/40 px-3 py-2 text-[11px] tracking-[0.2em] text-slate-100"
                  >
                    {t(copy.navigation.signIn, language)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDashboardClick}
                    className="w-full rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 text-[11px] tracking-[0.2em] text-emerald-100"
                  >
                    {t(copy.navigation.dashboard, language)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};


