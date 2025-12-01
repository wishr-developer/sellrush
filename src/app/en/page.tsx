import type { Metadata } from "next";
import { LandingPageInner } from "@/app/page";

// 英語版 LP 用メタデータ
export const metadata: Metadata = {
  title: "SELL RUSH – Cinematic Social Selling Arena",
  description:
    "A performance-based social selling arena for creators and brands. No upfront ad spend.",
  alternates: {
    canonical: "/en",
    languages: {
      ja: "/",
      en: "/en",
      "x-default": "/",
    },
  },
  openGraph: {
    title: "SELL RUSH – Social Selling Arena for Creators & Brands",
    description:
      "A dark, cinematic social selling platform where influencers and brands compete in data‑driven sales battles. No inventory risk, no upfront ad spend.",
    url: "/en",
    siteName: "SELL RUSH",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SELL RUSH – Social Selling Arena for Creators & Brands",
    description:
      "SELL RUSH turns selling into a sport for creators and brands with real‑time dashboards, tournaments, and pure performance‑based rewards.",
  },
};

export default function LandingPageEn(): JSX.Element {
  // `/en` では URL を最優先し、初期言語を強制的に "en" にする
  return <LandingPageInner initialLanguage="en" />;
}


