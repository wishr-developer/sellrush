"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LanguageProvider, useLanguage } from "@/lib/language";
import { copy, t } from "@/lib/copy";

type SetupRole = "creator" | "brand";

type ActivateState =
  | "initializing"
  | "needSetup"
  | "redirecting"
  | "error";

type ActivateInnerProps = {
  userRole: SetupRole | null;
  userId: string | null;
};

const ActivateInnerContent: React.FC<ActivateInnerProps> = ({
  userRole,
  userId,
}) => {
  const { language } = useLanguage();
  const c = copy.auth.activate;

  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveRole: SetupRole =
    userRole === "brand" ? "brand" : "creator";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId) {
      setError("Invalid session. Please try again.");
      return;
    }

    if (effectiveRole === "creator" && !displayName.trim()) {
      setError("Please enter your display name.");
      return;
    }
    if (effectiveRole === "brand" && !companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the terms.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Invalid session. Please try again.");
        return;
      }

      const currentMeta = user.user_metadata || {};
      const roleMeta =
        (currentMeta.role as SetupRole | undefined) ?? effectiveRole;

      const newMeta = {
        ...currentMeta,
        role: roleMeta,
        onboarded: true,
        ...(roleMeta === "creator"
          ? { displayName: displayName.trim() }
          : { companyName: companyName.trim() }),
      };

      const { error: updateError } = await supabase.auth.updateUser({
        data: newMeta,
      });

      if (updateError) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error(updateError);
        }
        setError("Setup failed. Please try again.");
        setSaving(false);
        return;
      }

      // セットアップ完了後はダッシュボードへ
      window.location.replace("/dashboard");
    } catch (e) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error(e);
      }
      setError("Setup failed. Please try again.");
      setSaving(false);
    }
  };

  const title =
    effectiveRole === "creator"
      ? t(c.titleCreator, language)
      : t(c.titleBrand, language);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/80 p-7 shadow-[0_24px_70px_rgba(0,0,0,0.9)]">
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
          {t(c.description, language)}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-[12px] text-red-200">
              {error}
            </div>
          )}

          {effectiveRole === "creator" ? (
            <div>
              <label
                htmlFor="activate-display-name"
                className="mb-1 block text-[11px] font-semibold text-slate-200"
              >
                {t(c.displayNameLabel, language)}
              </label>
              <input
                id="activate-display-name"
                name="displayName"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-400"
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="activate-company-name"
                className="mb-1 block text-[11px] font-semibold text-slate-200"
              >
                {t(c.companyNameLabel, language)}
              </label>
              <input
                id="activate-company-name"
                name="companyName"
                type="text"
                autoComplete="organization"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-400"
              />
            </div>
          )}

          <label
            htmlFor="activate-agree"
            className="flex items-start gap-2 text-[12px] text-slate-300"
          >
            <input
              id="activate-agree"
              name="agreed"
              type="checkbox"
              required
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-3 w-3 rounded border-white/30 bg-black text-sky-400"
            />
            <span>{t(c.agreeLabel, language)}</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-2.5 text-xs font-semibold tracking-[0.18em] text-black shadow-[0_18px_40px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-60"
          >
            {saving ? t(c.loading, language) : t(c.submit, language)}
          </button>
        </form>
      </div>
    </div>
  );
};

const ActivatePageInner: React.FC = () => {
  const router = useRouter();
  const { language } = useLanguage();
  const c = copy.auth.activate;

  const [state, setState] = useState<ActivateState>("initializing");
  const [role, setRole] = useState<SetupRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        // Magic Link からセッションを確立
        // 新しいSupabaseでは、URLハッシュから自動的にセッションが確立される
        // 明示的にセッションを取得
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // セッションがない場合は、URLからセッションを確立を試みる
        if (!session && typeof window !== "undefined") {
          // URLハッシュからセッション情報を取得
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            // セッションを手動で設定
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
              if (process.env.NODE_ENV === "development") {
                console.error("セッション確立エラー:", sessionError);
              }
            }
          }
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // ここでは /login へ戻さず、state をエラー表示状態にして画面上だけで案内する
          setState("error");
          return;
        }

        setUserId(user.id);

        const meta = user.user_metadata || {};
        if (meta.onboarded) {
          window.location.href = "/dashboard";
          return;
        }

        const r = (meta.role as SetupRole | undefined) ?? "creator";
        setRole(r);
        setState("needSetup");
      } catch (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error(error);
        }
        setState("error");
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列を空にして、マウント時のみ実行

  if (state === "initializing" || state === "redirecting") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center text-sm text-slate-300">
          {t(c.loading, language)}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center text-sm text-red-300">
          セッションの取得に失敗しました。もう一度ログインしてください。
        </div>
      </div>
    );
  }

  return <ActivateInnerContent userRole={role} userId={userId} />;
};

export default function ActivatePage() {
  return (
    <LanguageProvider>
      <ActivatePageInner />
    </LanguageProvider>
  );
}


