'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

export default function Header() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="fixed top-0 left-64 right-0 h-16 border-b border-[#2A2A30] bg-[#0F0F12] z-10">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[#B0B0B8]" />
          <span className="text-sm text-[#B0B0B8]">{userEmail}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </Button>
      </div>
    </header>
  )
}

