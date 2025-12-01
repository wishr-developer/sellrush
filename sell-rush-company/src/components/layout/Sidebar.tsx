'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, Settings, Building2, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const navItems = [
  { icon: LayoutDashboard, label: 'ダッシュボード', href: '/dashboard' },
  { icon: Package, label: '商品マスター管理', href: '/products' },
  { icon: Settings, label: '設定', href: '/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-[#2A2A30] bg-[#0F0F12]">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-[#2A2A30]">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#FFFFFF]" />
            <h1 className="text-lg font-semibold text-[#FFFFFF]">SELL RUSH</h1>
          </div>
          <p className="text-xs text-[#B0B0B8] mt-1">企業管理ダッシュボード</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#17171C] text-[#FFFFFF] border border-[#2563EB]'
                    : 'text-[#B0B0B8] hover:bg-[#17171C] hover:text-[#FFFFFF]'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-[#2A2A30]">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#B0B0B8] hover:bg-[#17171C] hover:text-[#FFFFFF] transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>ログアウト</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

