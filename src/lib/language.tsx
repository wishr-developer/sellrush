"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useMemo,
  useEffect,
} from "react";

export type Language = "ja" | "en";

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
};

type LanguageProviderProps = {
  children: ReactNode;
  /**
   * 初期言語。
   * - `/` では指定しない（ブラウザ言語を見て自動判定）
   * - `/en` では `"en"` を渡し、URLを最優先にする
   */
  initialLanguage?: Language;
};

/**
 * 言語コンテキスト + 軽いフェード演出を提供するプロバイダ
 *
 * 初期言語判定ルール（優先度）:
 * 1. URL（initialLanguage プロップ = /en など）
 * 2. ブラウザ言語（navigator.language）
 * 3. デフォルト: "ja"
 */
export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  initialLanguage,
}) => {
  const [language, setLanguageState] = useState<Language>(
    initialLanguage ?? "ja",
  );
  const [isFading, setIsFading] = useState(false);

  // URL で初期言語が明示されていない場合のみ、ブラウザ言語から推測
  useEffect(() => {
    if (initialLanguage) return;
    if (typeof navigator === "undefined") return;

    const navLang = navigator.language?.toLowerCase() ?? "";
    if (navLang.startsWith("en")) {
      setLanguageState("en");
    } else {
      setLanguageState("ja");
    }
  }, [initialLanguage]);

  const setLanguage = (next: Language) => {
    if (next === language) return;
    setIsFading(true);
    setTimeout(() => {
      setLanguageState(next);
      setIsFading(false);
    }, 150);
  };

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>
      <div className="relative">
        {children}
        {isFading && (
          <div className="pointer-events-none fixed inset-0 z-50 bg-black/70 transition-opacity" />
        )}
      </div>
    </LanguageContext.Provider>
  );
};

