'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Mail, Lock, Shield, ArrowRight, Loader2 } from 'lucide-react'

type LoginPhase = 'credentials' | 'mfa'

/**
 * 運営管理画面ログインページ
 * MFA（ワンタイムパスワード）対応
 */
export default function LoginPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<LoginPhase>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setErrorMessage(error.message)
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Admin ログイン成功時は必ず /admin に遷移させる
        // （role チェックや追加の保護は middleware 側に任せる）
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Admin login success, redirecting to /admin')
        }
        setIsLoading(false)
        router.replace('/admin')
        return
      }

      // 想定外ケース：data.user が存在しない
      setErrorMessage('ログインに失敗しました')
      setIsLoading(false)
    } catch (error: any) {
      setErrorMessage(error.message || 'ログインに失敗しました')
      setIsLoading(false)
    }
  }

  // 以降の MFA 関連ロジックは、今後の拡張用として残す
  // （現状は middleware 側で追加保護を行う想定）
  const handleVerifyMfaCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!mfaCode || mfaCode.length !== 6) {
      setErrorMessage('6桁のコードを入力してください')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // 登録済みのMFAファクターを取得
      const { data, error: listError } = await supabase.auth.mfa.listFactors()
      
      if (listError) throw listError

      const factors = data?.all || []
      const totpFactor = factors.find((factor) => factor.factor_type === 'totp' && factor.status === 'verified')
      
      if (!totpFactor) {
        throw new Error('MFAファクターが見つかりません')
      }

      // challengeAndVerifyを使用してコードを検証
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code: mfaCode,
      })

      if (verifyError) throw verifyError

      // 成功したらダッシュボードへリダイレクト
      router.push('/')
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
            <h1 className="text-4xl font-bold tracking-tight">SELL RUSH</h1>
          </div>
          <p className="text-gray-400">
            {phase === 'credentials' ? '運営管理画面ログイン' : 'ワンタイムコード認証'}
          </p>
        </div>

        {/* ログインフォーム */}
        <div className="bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl">
          {phase === 'credentials' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* メールアドレス */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  メールアドレス
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* パスワード */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  パスワード
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* エラーメッセージ */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* 送信ボタン */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  <>
                    ログイン
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyMfaCode} className="space-y-4">
              {/* MFAコード入力 */}
              <div>
                <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-300 mb-2">
                  Google Authenticatorのコードを入力してください
                </label>
                <Input
                  id="mfa-code"
                  type="text"
                  value={mfaCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setMfaCode(value)
                  }}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  認証アプリに表示されている6桁のコードを入力してください
                </p>
              </div>

              {/* エラーメッセージ */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* ボタン */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPhase('credentials')
                    setMfaCode('')
                    setErrorMessage(null)
                  }}
                  className="flex-1"
                >
                  戻る
                </Button>
                <Button
                  type="submit"
                  disabled={mfaCode.length !== 6 || isLoading}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      確認中...
                    </>
                  ) : (
                    <>
                      認証
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* フッター */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>© 2025 SELL RUSH Platform. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

