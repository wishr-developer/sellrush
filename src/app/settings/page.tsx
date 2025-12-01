"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LogOut, User, Mail, Shield } from 'lucide-react'
import MobileTabBar from '@/components/MobileTabBar'

/**
 * 設定ページ
 */
export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        setUser(user)
      } catch (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error('ユーザー認証エラー:', error)
        }
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">読み込み中...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">設定</h1>

        <div className="space-y-6">
          {/* ユーザー情報 */}
          <section className="bg-zinc-950/60 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              ユーザー情報
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-zinc-400" />
                <div>
                  <p className="text-sm text-zinc-400">メールアドレス</p>
                  <p className="text-white">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-zinc-400" />
                <div>
                  <p className="text-sm text-zinc-400">ユーザーID</p>
                  <p className="text-white font-mono text-sm">{user.id.substring(0, 20)}...</p>
                </div>
              </div>
            </div>
          </section>

          {/* ログアウト */}
          <section className="bg-zinc-950/60 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <LogOut className="w-5 h-5" />
              アカウント
            </h2>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors text-red-400"
            >
              <LogOut className="w-4 h-4" />
              ログアウト
            </button>
          </section>
        </div>
      </div>

      <MobileTabBar />
    </div>
  )
}

