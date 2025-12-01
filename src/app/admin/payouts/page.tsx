import type { Metadata } from "next";
import AdminPayoutsClient from "./AdminPayoutsClient";

export const metadata: Metadata = {
  title: "Admin Payouts | SELL RUSH",
  description: "報酬分配・支払い管理",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPayoutsPage() {
  return <AdminPayoutsClient />;
}

