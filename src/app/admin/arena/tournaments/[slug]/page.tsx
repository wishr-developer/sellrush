import type { Metadata } from "next";
import AdminTournamentDetailClient from "./AdminTournamentDetailClient";

export const metadata: Metadata = {
  title: "Tournament Detail | Admin | SELL RUSH",
  description: "トーナメント詳細・管理",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Admin Tournament Detail Page
 * 
 * トーナメント詳細ページ（Server Component）
 */
export default function AdminTournamentDetailPage() {
  return <AdminTournamentDetailClient />;
}

