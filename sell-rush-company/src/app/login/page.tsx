'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Mail, Lock } from 'lucide-react'

/**
 * ログインページ
 * 企業アカウントのログイン/新規登録
 */
export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (isLogin) {
        // ログイン
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          /**
           * NOTE:
           *  もともとは companies テーブルを参照し、
           *  ・会社レコードが無い → /settings?firstLogin=true
           *  ・ある → /dashboard
           *  という分岐をしていたが、RLS やスキーマ差分により 406 エラーが
           *  発生しログインできないケースがあったため、
           *  いったん「ログイン成功 = /dashboard に遷移」に簡略化する。
           *  将来的にバックエンド側の RLS / スキーマが安定したら、
           *  会社情報の有無チェックを復活させる想定。
           */
            router.push('/dashboard')
        }
      } else {
        // 新規登録
        if (!companyName) {
          setError('会社名を入力してください')
          setIsLoading(false)
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          // 会社情報を保存
          const { error: companyError } = await supabase
            .from('companies')
            .insert({
              owner_id: data.user.id,
              company_name: companyName,
            })

          if (companyError) throw companyError

          // 設定ページにリダイレクト
          router.push('/settings?firstLogin=true')
        }
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="w-12 h-12 text-[#171717]" />
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? 'ログイン' : '新規登録'}
          </CardTitle>
          <p className="text-sm text-[#737373] mt-2">
            {isLogin
              ? '企業アカウントにログイン'
              : '新しい企業アカウントを作成'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  会社名
                </label>
                <Input
                  type="text"
                  placeholder="株式会社サンプル"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">
                メールアドレス
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#737373]" />
                <Input
                  type="email"
                  placeholder="company@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#737373]" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '処理中...' : isLogin ? 'ログイン' : '新規登録'}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError(null)
                }}
                className="text-sm text-[#737373] hover:text-[#171717]"
              >
                {isLogin
                  ? 'アカウントをお持ちでない方はこちら'
                  : '既にアカウントをお持ちの方はこちら'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

