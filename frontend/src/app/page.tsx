import type { Metadata } from "next";
import { Navbar } from "@/components/layouts/navbar";
import { Footer } from "@/components/layouts/footer";
import { HeroSection } from "@/components/features/landing/hero-section";
import { ToolsGrid } from "@/components/features/landing/tools-grid";
import { StatsSection } from "@/components/features/landing/stats-section";
import { HowItWorks } from "@/components/features/landing/how-it-works";
import { FormatsSection } from "@/components/features/landing/formats-section";
import { Testimonials } from "@/components/features/landing/testimonials";
import { FAQSection } from "@/components/features/landing/faq-section";
import { CTASection } from "@/components/features/landing/cta-section";
import { AdBannerSlot } from "@/components/features/ads/ad-banner-slot";

export const metadata: Metadata = {
  title: "uLovepdf — Free Online Document Processing",
  description:
    "Merge, split, compress, convert PDFs and more. 12 free tools. No watermarks. No account required. Open source.",
};

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />

        {/* Slot #5: Post-Hero Marketing Banner */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AdBannerSlot slotNumber={5} className="my-8" />
        </div>

        <StatsSection />
        <ToolsGrid />

        {/* Slot #6: Mid-Page Marketing Banner */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AdBannerSlot slotNumber={6} className="my-10" />
        </div>

        <HowItWorks />
        <FormatsSection />
        <Testimonials />
        <FAQSection />

        {/* Slot #7: Pre-Footer Marketing Banner */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AdBannerSlot slotNumber={7} className="my-10" />
        </div>

        <CTASection />
      </main>
      <Footer />
    </>
  );
}
