import { useEffect } from "react";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { BenefitsSection } from "@/components/landing/benefits-section";
import { ForWhoSection } from "@/components/landing/for-who-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  useEffect(() => {
    document.title = "AI Community — Conecta, colabora y crece en IA";
    let desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (desc) desc.content = "La plataforma de referencia para profesionales de inteligencia artificial. Directorio, eventos, foro, recursos y marketplace en un solo lugar.";
    let og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (og) og.content = "AI Community — La comunidad de profesionales de IA";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium"
      >
        Saltar al contenido principal
      </a>

      <LandingHeader />

      <main id="main-content" tabIndex={-1}>
        <HeroSection />
        <BenefitsSection />
        <ForWhoSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
      </main>

      <LandingFooter />
    </div>
  );
}
