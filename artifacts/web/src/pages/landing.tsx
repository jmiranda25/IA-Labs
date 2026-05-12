import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
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
import {
  useGetLandingContent,
  getGetLandingContentQueryKey,
  type LandingSection,
  type LandingFaq,
} from "@workspace/api-client-react";

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

function findSection(sections: LandingSection[], key: string): LandingSection | null {
  return sections.find((s) => s.section === key && s.enabled) ?? null;
}

export default function LandingPage() {
  useLocation();
  const isPreview = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1";

  const { data } = useGetLandingContent(
    isPreview ? { preview: "1" } : undefined,
    {
      query: {
        queryKey: getGetLandingContentQueryKey(isPreview ? { preview: "1" } : undefined),
        staleTime: isPreview ? 0 : 60_000,
      },
    },
  );

  const sections = (data as any)?.sections as LandingSection[] | undefined;
  const faqs = (data as any)?.faqs as LandingFaq[] | undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Comunidad de IA en español — Aprende, conecta y construye</title>
        <meta name="description" content="Únete a la comunidad hispanohablante de IA. Eventos, recursos, foro y marketplace para builders, founders y profesionales." />
        <meta property="og:title" content="Comunidad de IA en español — Aprende, conecta y construye" />
        <meta property="og:description" content="Únete a la comunidad hispanohablante de IA. Eventos, recursos, foro y marketplace para builders, founders y profesionales." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Comunidad de IA en español — Aprende, conecta y construye" />
        <meta name="twitter:description" content="Únete a la comunidad hispanohablante de IA. Eventos, recursos, foro y marketplace para builders, founders y profesionales." />
        <script type="application/ld+json">{JSON_LD}</script>
      </Helmet>
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium"
      >
        Saltar al contenido principal
      </a>

      <LandingHeader />

      <main id="main-content" tabIndex={-1}>
        <HeroSection data={sections ? findSection(sections, "hero") : null} />
        <AboutSection data={sections ? findSection(sections, "about") : null} />
        <BenefitsSection data={sections ? findSection(sections, "benefits") : null} />
        <ForWhoSection data={sections ? findSection(sections, "who_is_for") : null} />
        <HowItWorksSection data={sections ? findSection(sections, "how_it_works") : null} />
        <TestimonialsSection data={sections ? findSection(sections, "testimonials") : null} />
        <FaqSection faqs={faqs} />
        <CtaSection data={sections ? findSection(sections, "cta_final") : null} />
      </main>

      <LandingFooter />
    </div>
  );
}
