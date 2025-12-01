import type { Metadata } from "next";

/**
 * Admin Login Layout
 * noindex を設定（本番環境でのセキュリティ）
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

