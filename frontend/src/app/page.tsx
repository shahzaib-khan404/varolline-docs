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

export const metadata: Metadata = {
  title: "Varolline Docs — Free Online Document Processing",
  description:
    "Merge, split, compress, convert PDFs and more. 12 free tools. No watermarks. No account required. Open source.",
};

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <ToolsGrid />
        <HowItWorks />
        <FormatsSection />
        <Testimonials />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
