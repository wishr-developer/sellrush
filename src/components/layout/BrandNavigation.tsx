/**
 * ブランド用ナビゲーションコンポーネント
 * 
 * クリエイターダッシュボードと共通化できる部分:
 * - ログアウトボタン
 * - ユーザー情報表示
 * - レスポンシブ対応
 * 
 * 違い:
 * - メニュー項目が異なる（Dashboard, Products, Orders vs Dashboard, Rankings）
 * - ロゴ/ブランディング（将来拡張用）
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface BrandNavigationProps {
  /** 現在のユーザーID */
  userId?: string;
}

/**
 * ブランド用ナビゲーションコンポーネント
 */
export function BrandNavigation({ userId }: BrandNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("ログアウトエラー:", error);
      }
    }
  };

  /**
   * ナビゲーションアイテムの定義
   */
  const navItems = [
    {
      href: "/brand/dashboard",
      label: "ダッシュボード",
      icon: LayoutDashboard,
    },
    {
      href: "/brand/products",
      label: "商品管理",
      icon: Package,
    },
    {
      href: "/brand/orders",
      label: "注文一覧",
      icon: ShoppingBag,
    },
    // 将来拡張用: Settings は Phase 6 以降で実装
    // {
    //   href: "/brand/settings",
    //   label: "設定",
    //   icon: Settings,
    // },
  ];

  /**
   * アクティブなルートかどうかを判定
   */
  const isActive = (href: string) => {
    if (href === "/brand/dashboard") {
      return pathname === "/brand" || pathname === "/brand/dashboard";
    }
    return pathname === href;
  };

  return (
    <>
      {/* デスクトップ用サイドバー */}
      <aside className="hidden w-60 flex-shrink-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-4 md:flex">
        {/* ヘッダー */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            SELL RUSH
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-50">
            Brand Console
          </p>
          <p className="mt-1 text-xs text-slate-500">
            あなたのブランドの商品と売上を管理します。
          </p>
        </div>

        {/* ナビゲーションメニュー */}
        <nav className="flex-1 space-y-1 text-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* フッター */}
        <div className="mt-4 border-t border-slate-800 pt-4 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-200 transition-colors"
          >
            <LayoutDashboard className="w-3 h-3" />
            クリエイターダッシュボードへ
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-200 transition-colors"
          >
            <X className="w-3 h-3" />
            LP に戻る
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 text-xs text-slate-500 hover:text-slate-200 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            ログアウト
          </button>
        </div>
      </aside>

      {/* モバイル用ヘッダー */}
      <header className="md:hidden sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              SELL RUSH
            </p>
            <p className="text-sm font-semibold text-slate-50">Brand Console</p>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* モバイルメニュー */}
        {isMobileMenuOpen && (
          <nav className="border-t border-slate-800 bg-slate-900/95 px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="border-t border-slate-800 pt-2 mt-2 space-y-1">
              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>クリエイターダッシュボードへ</span>
              </Link>
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>LP に戻る</span>
              </Link>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>ログアウト</span>
              </button>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}

