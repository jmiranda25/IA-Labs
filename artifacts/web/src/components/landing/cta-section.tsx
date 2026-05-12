import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useInView } from "./use-in-view";
import type { LandingSection } from "@workspace/api-client-react";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const DEFAULT_TITLE = "Tu próximo proyecto con IA empieza aquí.";
const DEFAULT_SUBTITLE = "Únete gratis y empieza a construir con la comunidad hoy mismo.";
const DEFAULT_CTA_TEXT = "Crear mi cuenta";
const DEFAULT_FINE_PRINT = "Sin tarjeta de crédito · Gratis para siempre en el núcleo";

interface CtaSectionProps {
  data?: LandingSection | null;
}

export function CtaSection({ data }: CtaSectionProps) {
  const { ref, inView } = useInView(0.2);
  const c = (data?.content ?? {}) as Record<string, unknown>;
  const title = data?.title ?? DEFAULT_TITLE;
  const subtitle = data?.subtitle ?? DEFAULT_SUBTITLE;
  const ctaText = (c.cta_text as string) ?? DEFAULT_CTA_TEXT;
  const finePrint = (c.fine_print as string) ?? DEFAULT_FINE_PRINT;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="cta-heading"
      className="border-t border-border/30 bg-white/[0.02]"
    >
      <motion.div
        initial={{ opacity: 0, y: REDUCED ? 0 : 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-28 sm:py-36"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-20 items-end">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Únete
            </span>
          </div>
          <div>
            <h2
              id="cta-heading"
              className="text-5xl sm:text-6xl lg:text-7xl font-extralight leading-none tracking-tight text-white mb-8"
            >
              {title}
            </h2>
            <p className="text-muted-foreground mb-10 max-w-lg text-base">{subtitle}</p>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Link
                href="/registro"
                className="inline-flex items-center gap-2 rounded-none bg-primary text-white text-[10px] tracking-[0.2em] uppercase px-8 py-4 hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {ctaText}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <span className="text-xs text-muted-foreground/50 self-center">{finePrint}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
