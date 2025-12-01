import type { Metadata } from "next";
import AdminOrdersClient from "./AdminOrdersClient";

export const metadata: Metadata = {
  title: "Admin Orders | SELL RUSH",
  description: "全注文の閲覧・管理",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminOrdersPage() {
  return <AdminOrdersClient />;
}

