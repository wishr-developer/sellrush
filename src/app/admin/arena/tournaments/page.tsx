import type { Metadata } from "next";
import AdminTournamentsClient from "./AdminTournamentsClient";

export const metadata: Metadata = {
  title: "Tournaments | Admin | SELL RUSH",
  description: "トーナメント一覧・管理",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Admin Tournaments Page
 * 
 * トーナメント一覧ページ（Server Component）
 */
export default function AdminTournamentsPage() {
  return <AdminTournamentsClient />;
}

