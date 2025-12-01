import type { Metadata } from "next";
import DashboardPageClient from "./DashboardPageClient";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * 司令室 / コマンドセンター
 * ログイン後のトップページ（サーバー側エントリ）
 */
export default function DashboardPage() {
  return <DashboardPageClient />;
}


