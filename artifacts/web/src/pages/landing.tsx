import { useEffect } from "react";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { AboutSection } from "@/components/landing/about-section";
import { BenefitsSection } from "@/components/landing/benefits-section";
import { ForWhoSection } from "@/components/landing/for-who-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "AI Community",
      url: "https://aicommunity.app",
      description:
        "Comunidad hispanohablante de IA para builders, founders y profesionales.",
      sameAs: [],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "¿Qué es esta comunidad y a quién está dirigida?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Es una comunidad hispanohablante para personas que construyen, aprenden o trabajan con IA: builders, founders, consultores y profesionales que quieren integrar IA en su día a día.",
          },
        },
        {
          "@type": "Question",
          name: "¿Tiene algún costo unirse?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "El acceso a la comunidad y al MVP es gratuito. En el futuro podrían existir niveles premium, pero el núcleo seguirá siendo abierto.",
          },
        },
        {
          "@type": "Question",
          name: "¿Qué nivel técnico necesito para participar?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Ninguno específico. Lo importante es tener ganas de construir y compartir.",
          },
        },
        {
          "@type": "Question",
          name: "¿Cómo funcionan los eventos y workshops?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Publicamos eventos dentro de la plataforma. Te registras con un clic (RSVP) y recibes el enlace y los recordatorios.",
          },
        },
        {
          "@type": "Question",
          name: "¿Puedo publicar mis servicios o productos en el marketplace?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sí. Cualquier participante puede crear un listado. Un administrador revisa antes de publicar para mantener la calidad.",
          },
        },
        {
          "@type": "Question",
          name: "¿Cómo se modera el foro?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Tenemos guías de comunidad simples: respeto, contenido on-topic y cero spam.",
          },
        },
        {
          "@type": "Question",
          name: "¿Mis datos están seguros?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Usamos autenticación con Clerk y políticas de Row Level Security. No vendemos datos a terceros.",
          },
        },
        {
          "@type": "Question",
          name: "¿Cómo me convierto en colaborador o admin?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Los roles de administrador se asignan manualmente desde el panel admin. Si quieres colaborar, escríbenos desde tu perfil.",
          },
        },
      ],
    },
  ],
});

export default function LandingPage() {
  useEffect(() => {
    document.title =
      "Comunidad de IA en español — Aprende, conecta y construye";

    const setMeta = (sel: string, val: string) => {
      const el = document.querySelector<HTMLMetaElement>(sel);
      if (el) el.content = val;
    };
    setMeta(
      'meta[name="description"]',
      "Únete a la comunidad hispanohablante de IA. Eventos, recursos, foro y marketplace para builders, founders y profesionales."
    );
    setMeta(
      'meta[property="og:title"]',
      "Comunidad de IA en español — Aprende, conecta y construye"
    );
    setMeta(
      'meta[property="og:description"]',
      "Únete a la comunidad hispanohablante de IA. Eventos, recursos, foro y marketplace para builders, founders y profesionales."
    );
    setMeta(
      'meta[name="twitter:title"]',
      "Comunidad de IA en español — Aprende, conecta y construye"
    );
    setMeta(
      'meta[name="twitter:description"]',
      "Únete a la comunidad hispanohablante de IA. Eventos, recursos, foro y marketplace para builders, founders y profesionales."
    );

    // JSON-LD
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "json-ld-landing";
    script.textContent = JSON_LD;
    const existing = document.getElementById("json-ld-landing");
    if (existing) existing.remove();
    document.head.appendChild(script);

    return () => {
      document.getElementById("json-ld-landing")?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium"
      >
        Saltar al contenido principal
      </a>

      <LandingHeader />

      <main id="main-content" tabIndex={-1}>
        <HeroSection />
        <AboutSection />
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
