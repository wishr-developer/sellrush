"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { HeroSection } from "@/components/sections/Hero";
import { EasyToStartSection } from "@/components/sections/EasyToStart";
import { ProductSection } from "@/components/sections/Product";
import { InfluencersSection } from "@/components/sections/Influencers";
import { BrandsSection } from "@/components/sections/Brands";
import { HowItWorksSection } from "@/components/sections/HowItWorks";
import { FeaturesSection } from "@/components/sections/Features";
import { PricingSection } from "@/components/sections/Pricing";
import { RoadmapSection } from "@/components/sections/Roadmap";
import { FAQSection } from "@/components/sections/FAQ";
import { FinalCTASection } from "@/components/sections/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { LanguageProvider, type Language } from "@/lib/language";
import { EarlyAccessModal } from "@/components/common/EarlyAccessModal";
import { trackEarlyAccessEvent } from "@/lib/analytics";

const sectionOrder = [
  "hero",
  "easy",
  "product",
  "influencers",
  "brands",
  "how-it-works",
  "features",
  "pricing",
  "roadmap",
  "faq",
  "final-cta",
] as const;

type SectionId = (typeof sectionOrder)[number];

type LandingPageInnerProps = {
  initialLanguage?: Language;
};

/**
 * SELL RUSH シネマティックLP本体。
 * `initialLanguage` により `/` と `/en` の初期表示言語を切り替える。
 */
export function LandingPageInner({
  initialLanguage,
}: LandingPageInnerProps): JSX.Element {
  const [activeSectionId, setActiveSectionId] = useState<SectionId>("hero");
  const [isEarlyAccessOpen, setIsEarlyAccessOpen] = useState(false);
  const [earlyAccessSource, setEarlyAccessSource] = useState<
    "hero" | "header" | "final" | null
  >(null);

  // IntersectionObserver を使用して、現在のセクションを検出
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-section-id]")
    );

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-section-id") as SectionId | null;
            if (id && sectionOrder.includes(id)) {
              setActiveSectionId(id);
            }
          }
        });
      },
      { threshold: 0.4 }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, []);

  const openEarlyAccess = (source: "hero" | "header" | "final") => {
    setEarlyAccessSource(source);
    setIsEarlyAccessOpen(true);
    trackEarlyAccessEvent("early_access_open", { source });
  };

  const closeEarlyAccess = () => {
    setIsEarlyAccessOpen(false);
    setEarlyAccessSource(null);
  };

  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <div className="relative min-h-screen bg-black text-white">
        <Header
          activeSectionId={activeSectionId}
          onOpenEarlyAccess={() => openEarlyAccess("header")}
        />

        {/* 右側の細長いインジケータ */}
        <div className="pointer-events-none fixed right-4 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2 md:right-6">
          {sectionOrder.map((id) => {
            const isActive = activeSectionId === id;
            return (
              <span
                key={id}
                className={`h-7 w-[2px] rounded-full bg-gradient-to-b from-slate-500/40 to-slate-700/40 transition-all duration-300 ${
                  isActive ? "from-sky-300 to-emerald-300 shadow-[0_0_12px_rgba(56,189,248,0.8)]" : ""
                }`}
              />
            );
          })}
        </div>

        <main className="space-y-0">
          <HeroSection onOpenEarlyAccess={() => openEarlyAccess("hero")} />
          <EasyToStartSection />
          <ProductSection />
          <InfluencersSection />
          <BrandsSection />
          <HowItWorksSection />
          <FeaturesSection />
          <PricingSection />
          <RoadmapSection />
          <FAQSection />
          <FinalCTASection
            onOpenEarlyAccess={() => openEarlyAccess("final")}
          />
        </main>

        <Footer />

        <EarlyAccessModal
          open={isEarlyAccessOpen}
          source={earlyAccessSource}
          onClose={closeEarlyAccess}
        />
      </div>
    </LanguageProvider>
  );
}

export default function LandingPage(): JSX.Element {
  // ルート `/` は initialLanguage を指定せず、
  // LanguageProvider 内でブラウザ言語を見て判定させる。
  return <LandingPageInner />;
}
