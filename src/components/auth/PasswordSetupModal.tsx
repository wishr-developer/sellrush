"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";
import { copy, t } from "@/lib/copy";
import { Lock, X } from "lucide-react";

type PasswordSetupModalProps = {
  onClose: () => void;
};

/**
 * Password Setup Modal
 * Allows users to set a password after Magic Link login
 */
export const PasswordSetupModal: React.FC<PasswordSetupModalProps> = ({
  onClose,
}) => {
  const { language } = useLanguage();
  const c = copy.auth.passwordSetup;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t(c.errorMismatch, language));
      return;
    }

    if (password.length < 6) {
      setError(
        language === "ja"
          ? "パスワードは6文字以上で入力してください。"
          : "Password must be at least 6 characters."
      );
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error(error);
        }
        setError(t(c.errorGeneric, language));
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
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

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/90 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.9)]">
          <p className="text-center text-sm text-slate-200">
            {t(c.success, language)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/90 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {t(c.title, language)}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mb-6 text-[13px] leading-relaxed text-slate-300">
          {t(c.description, language)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-[12px] text-red-200">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="password-setup-password"
              className="mb-1 block text-[11px] font-semibold text-slate-200"
            >
              {t(c.passwordLabel, language)}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="password-setup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black px-9 py-2.5 text-sm text-white outline-none transition focus:border-sky-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password-setup-confirm"
              className="mb-1 block text-[11px] font-semibold text-slate-200"
            >
              {t(c.confirmLabel, language)}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="password-setup-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black px-9 py-2.5 text-sm text-white outline-none transition focus:border-sky-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-white/20 bg-black/40 px-4 py-2.5 text-xs font-semibold tracking-[0.18em] text-slate-300 transition hover:bg-white/5"
            >
              {t(c.skip, language)}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-full bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.18em] text-black shadow-[0_18px_40px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-60"
            >
              {isLoading ? "SETTING..." : t(c.submit, language)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

