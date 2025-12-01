"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Box,
  Users,
  Wallet,
  LineChart,
  Shield,
  Settings,
} from "lucide-react";

type AdminLayoutProps = {
  children: ReactNode;
};

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Products", href: "/admin/products", icon: Box },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Payouts", href: "/admin/payouts", icon: Wallet },
  { label: "Analytics", href: "/admin/analytics", icon: LineChart },
  { label: "Security", href: "/admin/security", icon: Shield },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

/**
 * Admin 共通レイアウト
 * - 左サイドバー + 右側メインコンテンツ
 * - /admin および /admin/* で利用し、各ページは children として描画される。
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* サイドバー */}
      <aside className="w-56 border-r border-zinc-800 bg-zinc-950/90 flex flex-col">
        <div className="px-4 py-4 border-b border-white/10">
          <div className="text-xs font-semibold tracking-[0.22em] text-zinc-500 uppercase">
            SELL RUSH
          </div>
          <div className="mt-1 text-sm text-zinc-300">Admin Console</div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 text-sm">
          {navItems.map((item) => {
            const Icon = item.icon as React.ComponentType<{
              className?: string;
            }>;
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* 商品アリーナ（外部リンク） */}
          <a
            href="http://localhost:3000/market"
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800/80"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800">
              🏪
            </span>
            <span>商品アリーナ</span>
          </a>
          {/* TODO: 本番環境では環境変数から LP ホストを参照して URL を切り替える */}
        </nav>

        <div className="px-4 py-3 border-t border-white/10 text-[11px] text-zinc-500">
          SELL RUSH Admin
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-[#050509] via-[#05070f] to-[#020617]">
        {children}
      </div>
    </div>
  );
}


