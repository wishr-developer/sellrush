import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SELL RUSH - 企業管理ダッシュボード",
  description: "B2B向け商品管理・売上分析ダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.variable} font-sans antialiased bg-[#0F0F12] text-[#FFFFFF]`}
      >
        {children}
      </body>
    </html>
  );
}
