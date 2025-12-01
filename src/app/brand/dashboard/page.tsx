import { Metadata } from "next";
import BrandDashboardClient from "./BrandDashboardClient";

export const metadata: Metadata = {
  title: "Brand Dashboard | SELL RUSH",
  description: "企業向け管理画面 - 売上・商品・Creator パフォーマンスを確認",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Brand Dashboard Page (Server Component)
 */
export default function BrandDashboardPage() {
  return <BrandDashboardClient />;
}

