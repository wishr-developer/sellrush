import type { Metadata } from "next";
import AdminFraudClient from "./AdminFraudClient";

export const metadata: Metadata = {
  title: "Admin Fraud Radar | SELL RUSH",
  description: "不正検知・監査",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminFraudPage() {
  return <AdminFraudClient />;
}

