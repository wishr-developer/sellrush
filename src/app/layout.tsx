import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sellrush.vercel.app";

// ルート（日本語）側のデフォルトメタデータ
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SELL RUSH｜ソーシャルセリング・アリーナプラットフォーム",
  description:
    "インフルエンサーの売る力を競技に変える、販売バトル型ソーシャルセリング・プラットフォーム。",
  alternates: {
    canonical: "/",
    languages: {
      ja: "/",
      en: "/en",
      "x-default": "/",
    },
  },
  openGraph: {
    title: "SELL RUSH – ソーシャルセリング・アリーナプラットフォーム",
    description:
      "ランキングや賞金付きの販売バトルとリアルタイムダッシュボードで、「売る体験」をゲームのように楽しめるインフルエンサー特化型ソーシャルセリング・プラットフォーム。",
    url: "/",
    siteName: "SELL RUSH",
    locale: "ja_JP",
    type: "website",
    // TODO: OG 画像を追加する場合は /og-default.png などのパスを指定
    // images: [
    //   {
    //     url: "/og-default.png",
    //     width: 1200,
    //     height: 630,
    //     alt: "SELL RUSH",
    //   },
    // ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SELL RUSH – ソーシャルセリング・アリーナプラットフォーム",
    description:
      "インフルエンサーとブランドのための「販売バトル型」ソーシャルセリング・プラットフォーム SELL RUSH のシネマティックLP。",
    // TODO: Twitter 画像を追加する場合は /og-default.png などのパスを指定
    // images: ["/og-default.png"],
  },
  verification: {
    google: "HFQX07XJ6AWIutOvFEhHI68n6ait4ei8nchO3fFK4qY",
  },
};

import { ToastContainer } from "@/components/ui/Toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}

