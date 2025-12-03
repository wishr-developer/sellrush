import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arena / Tournaments | Admin | SELL RUSH",
  description: "トーナメント管理コンソール",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Admin Arena Layout
 * 
 * Arena / Tournament 管理セクションのレイアウト
 */
export default function AdminArenaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

