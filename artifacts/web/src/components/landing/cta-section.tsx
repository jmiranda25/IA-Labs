import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      className="max-w-6xl mx-auto px-4 sm:px-6 pb-24"
    >
      <motion.div
        initial={{ opacity: 0, scale: REDUCED ? 1 : 0.97 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/20 via-[hsl(190_100%_50%)]/8 to-primary/5 p-12 sm:p-16 text-center"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[hsl(190_100%_50%)]/15 blur-3xl"
        />

        <div className="relative">
          <h2
            id="cta-heading"
            className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4"
          >
            {title}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-lg">{subtitle}</p>
          <Button size="lg" className="gap-2 text-base px-8" asChild>
            <Link href="/registro">
              {ctaText}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground/70">{finePrint}</p>
        </div>
      </motion.div>
    </section>
  );
}
