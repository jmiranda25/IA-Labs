import { motion } from "framer-motion";
import type { LandingSection } from "@workspace/api-client-react";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  const c = (data?.content ?? {}) as Record<string, unknown>;
  const title = data?.title ?? DEFAULT_TITLE;
  const subtitle = data?.subtitle ?? DEFAULT_SUBTITLE;
  const rawItems = c.items as TestimonialItem[] | undefined;
  const items =
    Array.isArray(rawItems) && rawItems.length > 0 ? rawItems : DEFAULT_ITEMS;

  const [rawFeatured, ...rest] = items;
  const featured = rawFeatured
    ? {
        quote: rawFeatured.quote ?? "",
        name: rawFeatured.name ?? "Miembro",
        role: rawFeatured.role ?? "",
        initials: rawFeatured.initials ?? (rawFeatured.name ?? "M").slice(0, 2).toUpperCase(),
      }
    : null;

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="border-t border-border/30"
    >
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-20 mb-16">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Testimonios
            </span>
          </div>
          <div>
            <h2
              id="testimonials-heading"
              className="text-4xl sm:text-5xl font-extralight leading-none tracking-tight text-white mb-4"
            >
              {title}
            </h2>
            <p className="text-muted-foreground max-w-lg">{subtitle}</p>
          </div>
        </div>

        {/* Featured pull-quote */}
        {featured && (
          <motion.figure
            initial={{ opacity: 0, y: REDUCED ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="border-t border-border/30 pt-12 pb-12 mb-0"
          >
            <blockquote>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-extralight leading-snug text-white/80 max-w-4xl">
                &ldquo;{featured.quote}&rdquo;
              </p>
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-4">
              <div
                aria-hidden="true"
                className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0"
              >
                <span className="text-[10px] font-medium text-primary">
                  {(featured.initials ?? featured.name.slice(0, 2)).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-foreground uppercase tracking-widest">
                  {featured.name}
                </span>
                <span className="text-border/60" aria-hidden="true">—</span>
                <span className="text-xs text-muted-foreground">{featured.role}</span>
              </div>
            </figcaption>
          </motion.figure>
        )}

        {/* Secondary quotes */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border/30">
            {rest.map((item, i) => {
              const quote = item.quote ?? "";
              const name = item.name ?? "Miembro";
              const role = item.role ?? "";
              const initials = item.initials ?? name.slice(0, 2).toUpperCase();
              return (
                <motion.figure
                  key={i}
                  initial={{ opacity: 0, y: REDUCED ? 0 : 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                  className="border-b md:border-b-0 md:border-r border-border/30 last:border-0 pt-10 pr-0 md:pr-10 pb-10 flex flex-col gap-6"
                >
                  <blockquote>
                    <p className="text-base text-white/60 leading-relaxed font-light">
                      &ldquo;{quote}&rdquo;
                    </p>
                  </blockquote>
                  <figcaption className="flex items-center gap-3 mt-auto">
                    <div
                      aria-hidden="true"
                      className="h-7 w-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0"
                    >
                      <span className="text-[9px] font-bold text-foreground">{initials}</span>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-foreground uppercase tracking-widest">
                        {name}
                      </div>
                      <div className="text-xs text-muted-foreground">{role}</div>
                    </div>
                  </figcaption>
                </motion.figure>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
