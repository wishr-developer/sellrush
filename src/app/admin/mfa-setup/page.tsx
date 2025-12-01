"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { checkIsAdmin } from "@/lib/admin";
import { Shield, QrCode, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import QRCodeLib from "qrcode";

/**
 * 管理者MFAセットアップページ
 * 初回ログイン時またはMFA未設定時に表示
 * 注意: metadata は layout.tsx で設定
 */
export default function MfaSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'qr' | 'verify'>('qr')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 管理者チェックとMFAセットアップ開始（一度だけ実行）
  useEffect(() => {
    const initialize = async () => {
      // ログイン状態をチェック
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/admin/login'
        return
      }

      // 管理者かどうかをチェック
      const isAdmin = await checkIsAdmin()
      if (!isAdmin) {
        window.location.href = '/admin/login'
        return
      }

      // 既にMFAが設定されているかチェック
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const factors = factorsData?.all || []
      const hasVerifiedMfa = factors.some((f: { factor_type: string; status: string }) => f.factor_type === 'totp' && f.status === 'verified')
      
      if (hasVerifiedMfa) {
        // 既に設定済みの場合は管理画面へ
        window.location.href = '/admin'
        return
      }

      // MFAセットアップを開始
      await startMfaSetup()
    }

    void initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 依存配列を空にして、マウント時のみ実行

  /**
   * MFAセットアップ開始
   */
  const startMfaSetup = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      })

      if (error) throw error

      if (data?.totp?.qr_code && data?.id) {
        // QRコードを生成
        const qrDataUrl = await QRCodeLib.toDataURL(data.totp.qr_code)
        setQrCodeDataUrl(qrDataUrl)
        setMfaFactorId(data.id)
        setStep('qr')
      } else {
        throw new Error('QRコードの取得に失敗しました')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'MFAのセットアップに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * MFAコード確認
   */
  const handleVerifyMfaCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!mfaCode || mfaCode.length !== 6) {
      setErrorMessage('6桁のコードを入力してください')
      return
    }

    if (!mfaFactorId) {
      setErrorMessage('MFAファクターが見つかりません')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // challengeAndVerifyを使用してコードを検証
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode,
      })

      if (error) throw error

      // 成功したら管理画面へリダイレクト（無限ループを防ぐ）
      window.location.href = '/admin'
    } catch (error: any) {
      setErrorMessage(error.message || 'コードの確認に失敗しました')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-400 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">MFAセットアップ</h1>
          </div>
          <p className="text-gray-400">
            2段階認証を設定してください
          </p>
        </div>

        {/* セットアップフォーム */}
        <div className="bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl">
          {step === 'qr' && qrCodeDataUrl ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">ステップ 1: QRコードをスキャン</h2>
                <p className="text-sm text-gray-400 mb-4">
                  Google Authenticator、Microsoft AuthenticatorなどのアプリでQRコードをスキャンしてください
                </p>
              </div>

              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64" />
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-400 mb-2">
                  <strong>手順:</strong>
                </p>
                <ol className="text-xs text-blue-300/80 space-y-1 list-decimal list-inside">
                  <li>Google Authenticatorなどのアプリを開く</li>
                  <li>「QRコードをスキャン」を選択</li>
                  <li>上記のQRコードをスキャン</li>
                  <li>アプリに6桁のコードが表示されたら「次へ」をクリック</li>
                </ol>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={() => setStep('verify')}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                次へ
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : step === 'verify' ? (
            <form onSubmit={handleVerifyMfaCode} className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">ステップ 2: コードを確認</h2>
                <p className="text-sm text-gray-400 mb-4">
                  認証アプリに表示されている6桁のコードを入力してください
                </p>
              </div>

              <div>
                <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-300 mb-2">
                  認証コード（6桁）
                </label>
                <input
                  id="mfa-code"
                  name="mfaCode"
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setMfaCode(value)
                  }}
                  placeholder="000000"
                  className="w-full text-center text-2xl tracking-widest font-mono bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent py-3"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('qr')
                    setMfaCode('')
                    setErrorMessage(null)
                  }}
                  className="flex-1 py-3 px-4 border border-white/20 text-white rounded-lg font-medium hover:bg-white/10 transition-colors"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={mfaCode.length !== 6 || isLoading}
                  className="flex-1 py-3 px-4 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      確認中...
                    </>
                  ) : (
                    <>
                      有効化
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-400">セットアップを準備中...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

