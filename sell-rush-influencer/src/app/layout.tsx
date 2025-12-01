import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SELL RUSH - インフルエンサー管理画面",
  description: "SELL RUSH インフルエンサー向け管理画面",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}

