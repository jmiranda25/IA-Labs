import { useInView } from "./use-in-view";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { LandingFaq } from "@workspace/api-client-react";

const DEFAULT_FAQS = [
  {
    q: "¿Qué es esta comunidad y a quién está dirigida?",
    a: "Es una comunidad hispanohablante para personas que construyen, aprenden o trabajan con IA: builders, founders, consultores y profesionales que quieren integrar IA en su día a día. No es un grupo solo de consumo de noticias: el foco está en hacer.",
  },
  {
    q: "¿Tiene algún costo unirse?",
    a: "El acceso a la comunidad y al MVP es gratuito. En el futuro podrían existir niveles premium para eventos cerrados o marketplace, pero el núcleo seguirá siendo abierto.",
  },
  {
    q: "¿Qué nivel técnico necesito para participar?",
    a: "Ninguno específico. Hay miembros que recién empiezan y otros que ya tienen productos en producción. Lo importante es tener ganas de construir y compartir.",
  },
  {
    q: "¿Cómo funcionan los eventos y workshops?",
    a: "Publicamos eventos dentro de la plataforma. Te registras con un clic (RSVP) y recibes el enlace y los recordatorios. La mayoría son online; algunos presenciales por ciudad.",
  },
  {
    q: "¿Puedo publicar mis servicios o productos en el marketplace?",
    a: "Sí. Cualquier participante puede crear un listado (servicio, plantilla, agente, curso). Un administrador revisa antes de publicar para mantener la calidad. En el MVP no hay pasarela de pagos: el contacto inicial se hace dentro de la plataforma.",
  },
  {
    q: "¿Cómo se modera el foro?",
    a: "Tenemos guías de comunidad simples: respeto, contenido on-topic y cero spam. Los administradores pueden cerrar, fijar o eliminar hilos cuando sea necesario.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Usamos autenticación con Clerk y políticas de Row Level Security que aseguran que cada usuario solo accede a lo suyo. No vendemos datos a terceros.",
  },
  {
    q: "¿Cómo me convierto en colaborador o admin?",
    a: "Los roles de administrador se asignan manualmente desde el panel admin. Si quieres colaborar (organizar eventos, curar recursos, moderar), escríbenos desde tu perfil.",
  },
];

interface FaqSectionProps {
  faqs?: LandingFaq[] | null;
}

export function FaqSection({ faqs }: FaqSectionProps) {
  const { ref, inView } = useInView(0.1);

  const items =
    faqs && faqs.length > 0
      ? faqs.filter((f) => f.enabled).map((f) => ({ q: f.question, a: f.answer }))
      : DEFAULT_FAQS;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="faq-heading"
      className="border-t border-border/30"
    >
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-20">
          <div className="lg:pt-1">
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground block mb-4">
              FAQ
            </span>
            <h2
              id="faq-heading"
              className="text-4xl sm:text-5xl font-extralight leading-none tracking-tight text-white mb-4"
            >
              Preguntas frecuentes
            </h2>
            <p className="text-xs text-muted-foreground">
              ¿No encuentras tu respuesta?{" "}
              <span className="text-muted-foreground/70">
                Escríbenos desde tu perfil.
              </span>
            </p>
          </div>

          <div
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "none" : "translateY(16px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            <Accordion type="single" collapsible className="w-full">
              {items.map(({ q, a }, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border-b border-border/30"
                >
                  <AccordionTrigger className="text-left text-sm font-light text-white/80 hover:no-underline hover:text-white transition-colors py-6 [&>svg]:text-muted-foreground">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-6 font-light">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
