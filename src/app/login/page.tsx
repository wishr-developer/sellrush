"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Mail, Lock } from "lucide-react";
import { LanguageProvider, useLanguage } from "@/lib/language";
import { copy, t } from "@/lib/copy";

type LoginMethod = "password" | "magicLink";
type LoginMode = "creator" | "brand";

const brandDashboardUrl =
  process.env.NEXT_PUBLIC_BRAND_DASHBOARD_URL ??
  "http://localhost:3002/dashboard";

const LoginInner: React.FC = () => {
  const router = useRouter();
  const { language } = useLanguage();
  const c = copy.auth.login;

  const [method, setMethod] = useState<LoginMethod>("password");
  const [mode, setMode] = useState<LoginMode>("creator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMagicLinkSuggestion, setShowMagicLinkSuggestion] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  // NOTE:
  //  以前はここで supabase.auth.getUser() を呼び、既ログインユーザーを
  //  自動リダイレクトしていたが、/dashboard 側との役割判定と競合し
  //  ループや AuthSessionMissingError を誘発していた。
  //  現在は「ログインページは常にフォームを出す」だけにし、
  //  リダイレクトは middleware / 各ダッシュボード側に任せる。

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 開発環境でのみログ出力
      if (process.env.NODE_ENV === "development") {
        console.log("Attempting login with email:", email);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("Login error:", error);
        }
        
        // パスワードが設定されていない場合のエラー
        // Supabase は "Invalid login credentials" を返すが、
        // パスワード未設定の場合も同じエラーになる可能性がある
        if (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("Email not confirmed")
        ) {
          // パスワードが設定されていない可能性がある場合、Magic Link を促す
          // より具体的なメッセージを表示
          setError(t(c.errorPasswordNotSet, language));
          setShowMagicLinkSuggestion(true);
        } else {
          setError(t(c.errorPassword, language));
          setShowMagicLinkSuggestion(false);
        }
        setIsLoading(false);
        return;
      }

      // ログイン成功時: 選択モードに応じて 1 回だけ遷移させる
      if (data?.user) {
        if (process.env.NODE_ENV === "development") {
          // 開発時のみ、誰でログインしたか確認用ログ（本番では出さない）
          // eslint-disable-next-line no-console
          console.log("[login] password login success", {
            id: data.user.id,
            // TODO: 将来的に user_metadata.role と mode の整合性をチェックする
            // role: (data.user.user_metadata as any)?.role,
            mode,
          });
        }

        // セッション cookie 反映のラグを少し吸収
        await new Promise((resolve) => setTimeout(resolve, 150));

        // App Router の router / window.location を使って 1 回だけ遷移
        if (mode === "brand") {
          // 企業ログイン時は /brand に遷移
          router.replace("/brand");
        } else {
          // クリエイターは従来どおり自アプリ内のダッシュボードへ
          router.replace("/dashboard");
        }
        return;
      } else {
        // ユーザーデータが取得できない場合
        setError(t(c.errorPassword, language));
        setIsLoading(false);
      }
    } catch (err) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Login exception:", err);
      }
      setError(t(c.errorPassword, language));
      setShowMagicLinkSuggestion(false);
      setIsLoading(false);
    }
  };

  const handleMagicLinkSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/activate`,
        },
      });

      if (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error(error);
        }
        setError(t(c.errorGeneric, language));
        return;
      }

      setIsSent(true);
    } catch (err) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error(err);
      }
      setError(t(c.errorGeneric, language));
    } finally {
      setIsLoading(false);
    }
  };

  // 認証チェック中はローディング表示
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-4 text-2xl font-semibold tracking-[0.22em] text-slate-200">
            SELL RUSH
          </div>
          <div className="text-sm text-slate-400">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-[0.22em] text-slate-200">
            SELL RUSH
          </h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-7 shadow-[0_24px_70px_rgba(0,0,0,0.9)]">
          <h2 className="text-lg font-semibold text-white">
            {t(c.title, language)}
          </h2>

          {/* ログインモード切り替え（インフルエンサー / 企業） */}
          <div className="mt-4 mb-3 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMode("creator")}
              className={`rounded-full px-3 py-1 transition-colors ${
                mode === "creator"
                  ? "bg-emerald-500 text-black"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              インフルエンサーとしてログイン
            </button>
            <button
              type="button"
              onClick={() => setMode("brand")}
              className={`rounded-full px-3 py-1 transition-colors ${
                mode === "brand"
                  ? "bg-emerald-500 text-black"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              企業としてログイン
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-2 border-b border-white/10">
            <button
              type="button"
              onClick={() => {
                setMethod("password");
                setError(null);
                setIsSent(false);
                setShowMagicLinkSuggestion(false);
              }}
              className={`flex-1 pb-2 text-[12px] font-medium transition-colors ${
                method === "password"
                  ? "border-b-2 border-white text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t(c.tabPassword, language)}
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod("magicLink");
                setError(null);
                setIsSent(false);
                setShowMagicLinkSuggestion(false);
              }}
              className={`flex-1 pb-2 text-[12px] font-medium transition-colors ${
                method === "magicLink"
                  ? "border-b-2 border-white text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t(c.tabMagicLink, language)}
            </button>
          </div>

          {/* Password Login Form */}
          {method === "password" && (
            <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-[12px] text-red-200 whitespace-pre-line">
                    {error}
                  </div>
                  {showMagicLinkSuggestion && (
                    <button
                      type="button"
                      onClick={() => {
                        setMethod("magicLink");
                        setError(null);
                        setPassword("");
                        setShowMagicLinkSuggestion(false);
                      }}
                      className="w-full rounded-full border border-sky-400/60 bg-sky-500/10 px-4 py-2 text-[11px] font-semibold tracking-[0.18em] text-sky-200 transition hover:bg-sky-500/20"
                    >
                      {t(c.tabMagicLink, language)}
                    </button>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1 block text-[11px] font-semibold text-slate-200"
                >
                  {t(c.emailLabel, language)}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-black px-9 py-2.5 text-sm text-white outline-none transition focus:border-sky-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1 block text-[11px] font-semibold text-slate-200"
                >
                  {t(c.passwordLabel, language)}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-black px-9 py-2.5 text-sm text-white outline-none transition focus:border-sky-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-2.5 text-xs font-semibold tracking-[0.18em] text-black shadow-[0_18px_40px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-60"
              >
                {isLoading ? "SIGNING IN..." : t(c.submitPassword, language)}
              </button>
            </form>
          )}

          {/* Magic Link Login Form */}
          {method === "magicLink" && (
            <form onSubmit={handleMagicLinkSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-[12px] text-red-200">
                  {error}
                </div>
              )}

              {!isSent && (
                <>
                  <p className="text-[13px] leading-relaxed text-slate-300">
                    {t(c.subtitle, language)}
                  </p>

                  <div>
                    <label
                      htmlFor="magic-link-email"
                      className="mb-1 block text-[11px] font-semibold text-slate-200"
                    >
                      {t(c.emailLabel, language)}
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="magic-link-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-black px-9 py-2.5 text-sm text-white outline-none transition focus:border-sky-400"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-2.5 text-xs font-semibold tracking-[0.18em] text-black shadow-[0_18px_40px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {isLoading ? "SENDING..." : t(c.submit, language)}
                  </button>
                </>
              )}

              {isSent && (
                <p className="text-[13px] leading-relaxed text-slate-200">
                  {t(c.sentMessage, language)}
                </p>
              )}
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          <a href="/" className="text-slate-400 hover:text-white underline">
            SELL RUSH LP
          </a>
        </p>
      </div>
    </div>
  );
};

export default function LoginPage() {
  return (
    <LanguageProvider>
      <LoginInner />
    </LanguageProvider>
  );
}


