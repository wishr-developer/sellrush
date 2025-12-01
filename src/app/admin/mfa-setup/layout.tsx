import type { Metadata } from "next";

/**
 * Admin MFA Setup Layout
 * noindex を設定（本番環境でのセキュリティ）
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminMfaSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

