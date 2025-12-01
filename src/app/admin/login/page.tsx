"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Step = "credentials" | "mfa";

/**
 * 運営管理者ログインページ
 * メール+PW → 管理者チェック → MFA必須
 * 注意: metadata は layout.tsx で設定
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. メール + パスワードでログイン → 管理者 + MFA有無チェック
  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 1-1. email / password でログイン
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error(signInError);
      }
      setError("メールアドレスまたはパスワードが正しくありません。");
      setLoading(false);
      return;
    }

    const user = data.user;

    // 1-2. profiles.role を見て管理者かチェック
    // まず user_metadata.role をチェック
    if (user.user_metadata?.role === 'admin') {
      // user_metadata で管理者と判定された場合
    } else {
      // profiles テーブルから role を取得（存在する場合）
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        // テーブルが存在しない場合はエラーを無視（user_metadata のみを信頼）
        // 本番環境では警告をログに出力しない
        if (process.env.NODE_ENV === "development") {
          console.warn('profilesテーブルの取得エラー:', profileError);
        }
      }

      if (!profile || profile.role !== "admin") {
        setError("このアカウントには管理者権限がありません。");
        // 念のためサインアウトしておく
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
    }

    // 1-3. MFA（TOTP）ファクターを持っているか確認
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

    if (factorsError) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error(factorsError);
      }
      setError("MFAの状態確認に失敗しました。");
      setLoading(false);
      return;
    }

    // factorsData の構造を確認（all プロパティを使用）
    const factors = factorsData?.all || [];
    const totpFactor = factors.find(
      (f: { factor_type: string; status: string }) => f.factor_type === "totp" && f.status === "verified"
    );

    // まだTOTPが設定されていない → /admin/mfa-setup に飛ばして初期設定
    if (!totpFactor) {
      setLoading(false);
      window.location.href = "/admin/mfa-setup";
      return;
    }

    // TOTPがある → 6桁コード入力ステップへ
    setFactorId(totpFactor.id as string);
    setStep("mfa");
    setLoading(false);
  };

  // 2. 6桁コードを challenge + verify → OKなら /admin へ
  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!factorId) return;

    setLoading(true);
    setError(null);

    // 2-1. challenge を発行
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError || !challenge) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error(challengeError);
      }
      setError("認証コードの検証に失敗しました。もう一度お試しください。");
      setLoading(false);
      return;
    }

    // 2-2. verify で6桁コードを検証
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error(verifyError);
      }
      setError("コードが正しくありません。再度入力してください。");
      setLoading(false);
      return;
    }

    // OK → /admin へ（無限ループを防ぐ）
    window.location.href = "/admin";
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <h1 className="text-lg font-semibold mb-2">管理者ログイン</h1>
        <p className="text-xs text-slate-400 mb-4">
          SELL RUSH 運営管理画面へのログインです。一般ユーザーはアクセスできません。
        </p>

        {step === "credentials" && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-login-email"
                className="block text-xs text-slate-300 mb-1"
              >
                メールアドレス
              </label>
              <input
                id="admin-login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label
                htmlFor="admin-login-password"
                className="block text-xs text-slate-300 mb-1"
              >
                パスワード
              </label>
              <input
                id="admin-login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 whitespace-pre-line">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400 disabled:opacity-60"
            >
              {loading ? "ログイン中..." : "ログインして次へ"}
            </button>
          </form>
        )}

        {step === "mfa" && (
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <p className="text-sm text-slate-300">
              認証アプリに表示されている6桁のコードを入力してください。
            </p>

            <div>
              <label
                htmlFor="admin-mfa-code"
                className="block text-xs text-slate-300 mb-1"
              >
                6桁コード
              </label>
              <input
                id="admin-mfa-code"
                name="mfaCode"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                }}
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm tracking-[0.4em] text-center outline-none focus:border-sky-500"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 whitespace-pre-line">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sky-400 disabled:opacity-60"
            >
              {loading ? "確認中..." : "管理画面に入る"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
