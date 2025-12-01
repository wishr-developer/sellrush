"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, Menu, X } from "lucide-react";

/**
 * ヘッダー
 * ロゴ、ナビゲーション、ログイン・CTAボタン
 */
export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#050505]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* ロゴ */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-400 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          SELL RUSH
        </Link>

        {/* 中央ナビゲーション（デスクトップ） */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection("products")}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Products
          </button>
          <button
            onClick={() => scrollToSection("how-it-works")}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            How it works
          </button>
          {/* 注意: 本番環境では環境変数または適切なドメインを使用すること（現状は開発環境用の localhost） */}
          <a
            href="http://localhost:3002"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            For Brands
          </a>
        </div>

        {/* 右側（ログイン・CTA） */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden md:block text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            ログイン
          </Link>
          <Link
            href="/login"
            className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-colors"
          >
            販売をはじめる
          </Link>

          {/* モバイルメニューボタン */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2"
            aria-label="メニュー"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* モバイルメニュー */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#050505]">
          <div className="px-6 py-4 space-y-4">
            <button
              onClick={() => scrollToSection("products")}
              className="block w-full text-left text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Products
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="block w-full text-left text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              How it works
            </button>
            {/* 注意: 本番環境では環境変数または適切なドメインを使用すること（現状は開発環境用の localhost） */}
            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-left text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              For Brands
            </a>
            <Link
              href="/login"
              className="block w-full text-left text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              ログイン
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

