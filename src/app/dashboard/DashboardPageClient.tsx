"use client";

import DashboardClient from "./DashboardClient";
import { LanguageProvider } from "@/lib/language";

/**
 * Dashboard Page Client Wrapper
 * LanguageProvider を使用するための Client Component ラッパー
 */
export default function DashboardPageClient() {
  return (
    <LanguageProvider>
      <DashboardClient />
    </LanguageProvider>
  );
}

