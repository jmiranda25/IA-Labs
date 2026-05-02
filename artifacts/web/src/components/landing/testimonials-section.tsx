import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { useInView } from "./use-in-view";
import type { LandingSection } from "@workspace/api-client-react";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const GRADIENT_COLORS = [
  "from-primary/30 to-primary/10",
  "from-[hsl(190_100%_50%)]/30 to-[hsl(190_100%_50%)]/10",
  "from-primary/30 to-[hsl(190_100%_50%)]/10",
];

const DEFAULT_TITLE = "Lo que dicen nuestros miembros";
const DEFAULT_SUBTITLE = "Personas reales, resultados concretos.";
const DEFAULT_ITEMS = [
  {
    quote:
      "Aquí encontré la comunidad que no sabía que necesitaba para empezar a construir agentes en serio.",
    name: "Nombre Apellido",
    role: "Founder en [Empresa]",
    initials: "NA",
  },
  {
    quote: "Los workshops valen oro. Aprendí más en un mes que en seis meses solo.",
    name: "Nombre Apellido",
    role: "AI Engineer",
    initials: "NA",
  },
  {
    quote: "El marketplace me trajo mis primeros tres clientes consultando con IA.",
    name: "Nombre Apellido",
    role: "Consultor independiente",
    initials: "NA",
  },
];

interface TestimonialItem {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

interface TestimonialsSectionProps {
  data?: LandingSection | null;
}

export function TestimonialsSection({ data }: TestimonialsSectionProps) {
  const { ref, inView } = useInView();
  const c = (data?.content ?? {}) as Record<string, unknown>;
  const title = data?.title ?? DEFAULT_TITLE;
  const subtitle = data?.subtitle ?? DEFAULT_SUBTITLE;
  const items = (c.items as TestimonialItem[]) ?? DEFAULT_ITEMS;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="testimonials-heading"
      className="bg-card/40 border-y border-border py-24"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2
            id="testimonials-heading"
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
          >
            {title}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map(({ quote, name, role, initials }, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, y: REDUCED ? 0 : 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card p-8 flex flex-col gap-6"
            >
              <Quote className="h-5 w-5 text-primary/60 shrink-0" aria-hidden="true" />
              <blockquote>
                <p className="text-foreground/90 leading-relaxed text-sm">"{quote}"</p>
              </blockquote>
              <figcaption className="flex items-center gap-3 mt-auto">
                <div
                  aria-hidden="true"
                  className={`h-10 w-10 rounded-full bg-gradient-to-br ${GRADIENT_COLORS[i % GRADIENT_COLORS.length]} flex items-center justify-center shrink-0`}
                >
                  <span className="text-xs font-bold text-foreground">{initials}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{name}</div>
                  <div className="text-xs text-muted-foreground">{role}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
