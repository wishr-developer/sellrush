"use client";

import { useEffect, useState, type FormEvent } from "react";
import { trackEarlyAccessEvent } from "@/lib/analytics";
import { useLanguage } from "@/lib/language";
import { copy, t } from "@/lib/copy";

type EarlyAccessSource = "hero" | "header" | "final";

type Props = {
  open: boolean;
  source: EarlyAccessSource | null;
  onClose: () => void;
};

export const EarlyAccessModal: React.FC<Props> = ({
  open,
  source,
  onClose,
}) => {
  const { language } = useLanguage();
  const c = copy.earlyAccess;
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"influencer" | "brand" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC キーで閉じる
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !role) {
      setError("Please enter your email and select a role.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const eaRole = role;

    try {
      // 本番環境ではログを出力しない（開発環境のみ）
      if (process.env.NODE_ENV === "development") {
        console.log("early_access_submit", { email, role: eaRole, source });
      }
      trackEarlyAccessEvent("early_access_submit", {
        source: source ?? undefined,
        role: eaRole,
      });

      // 実際の保存処理は Step4 以降で API に接続する想定。
      await new Promise((resolve) => setTimeout(resolve, 500));

      setIsCompleted(true);
      trackEarlyAccessEvent("early_access_complete", {
        source: source ?? undefined,
        role: eaRole,
      });
    } catch (e) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error(e);
      }
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setRole("");
    setIsSubmitting(false);
    setIsCompleted(false);
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-black/90 p-6 text-sm text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-xs text-slate-400 hover:text-slate-200"
        >
          CLOSE
        </button>

        {!isCompleted ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.28em] text-slate-400">
                EARLY ACCESS
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {t(c.title, language)}
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-200">
                {t(c.description, language)}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="early-access-email"
                  className="mb-1 block text-[11px] font-semibold text-slate-300"
                >
                  {t(c.emailLabel, language)}
                </label>
                <input
                  id="early-access-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">
                  {t(c.roleLabel, language)}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("influencer")}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      role === "influencer"
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-white/15 bg-white/5 text-slate-200 hover:border-sky-400/70"
                    }`}
                  >
                    {t(c.roleCreatorInfluencer, language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("brand")}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      role === "brand"
                        ? "border-amber-400 bg-amber-500/15 text-amber-100"
                        : "border-white/15 bg-white/5 text-slate-200 hover:border-amber-400/70"
                    }`}
                  >
                    {t(c.roleBrandCompany, language)}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-[11px] text-red-400 whitespace-pre-line">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-2.5 text-xs font-semibold tracking-[0.18em] text-black shadow-[0_18px_40px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-60"
            >
              {isSubmitting ? "SENDING..." : t(c.submitLabel, language)}
            </button>

            <p className="mt-1 text-[10px] text-slate-500">
              {t(c.note, language)}
            </p>
          </form>
        ) : (
          <div className="space-y-4 pt-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.28em] text-slate-400">
                {t(c.thanksLabel, language)}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {t(c.thanksTitle, language)}
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-200">
                {t(c.thanksBody, language)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-white/30 bg-transparent px-6 py-2.5 text-xs font-semibold tracking-[0.18em] text-slate-100 transition hover:bg-white/10"
            >
              {t(c.closeLabel, language)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


