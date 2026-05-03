import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LandingSection } from "@workspace/api-client-react";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const base = { opacity: 0, y: REDUCED ? 0 : 24 };
const into = (delay: number) => ({
  opacity: 1,
  y: 0,
  transition: { duration: 0.55, delay, ease: "easeOut" as const },
});

const DEFAULT_TITLE_PLAIN = "Construye, aprende y crece con la";
const DEFAULT_TITLE_GRADIENT = "comunidad de IA.";
const DEFAULT_SUBTITLE =
  "Conéctate con builders, founders y profesionales que están creando con IA todos los días. Eventos, recursos, foro y marketplace en un solo lugar.";
const DEFAULT_BADGE = "🤝 Comunidad de IA en español";
const DEFAULT_CTA_PRIMARY = "Unirme gratis";
const DEFAULT_CTA_SECONDARY = "Ya tengo cuenta";
const DEFAULT_STATS = [
  { value: "+500", label: "miembros activos" },
  { value: "+20", label: "workshops realizados" },
  { value: "+100", label: "recursos curados" },
];

interface HeroSectionProps {
  data?: LandingSection | null;
}

export function HeroSection({ data }: HeroSectionProps) {
  const c = (data?.content ?? {}) as Record<string, unknown>;
  const badge = (c.badge as string) ?? DEFAULT_BADGE;
  const ctaPrimary = (c.cta_primary as string) ?? DEFAULT_CTA_PRIMARY;
  const ctaSecondary = (c.cta_secondary as string) ?? DEFAULT_CTA_SECONDARY;
  const stats = (c.stats as typeof DEFAULT_STATS) ?? DEFAULT_STATS;

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32 text-center px-4"
    >
      {/* Radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-start justify-center"
      >
        <div className="h-[600px] w-[900px] rounded-full bg-primary/10 blur-[120px] -translate-y-1/3" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        <motion.div initial={base} animate={into(0)}>
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs inline-flex">
            <span aria-hidden="true">{badge.startsWith("🤝") ? badge.slice(0, 2) : "🤝"}</span>
            {badge.startsWith("🤝") ? badge.slice(2).trim() : badge}
          </Badge>
        </motion.div>

        <motion.h1
          id="hero-heading"
          initial={base}
          animate={into(0.1)}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6"
        >
          {data?.title ? (
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[hsl(190_100%_50%)]">
              {data.title}
            </span>
          ) : (
            <>
              {DEFAULT_TITLE_PLAIN}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[hsl(190_100%_50%)]">
                {DEFAULT_TITLE_GRADIENT}
              </span>
            </>
          )}
        </motion.h1>

        <motion.p
          initial={base}
          animate={into(0.2)}
          className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
        >
          {data?.subtitle ?? DEFAULT_SUBTITLE}
        </motion.p>

        <motion.div
          initial={base}
          animate={into(0.3)}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <Button size="lg" className="gap-2 text-base" asChild>
            <Link href="/registro">
              {ctaPrimary}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base" asChild>
            <Link href="/iniciar-sesion">{ctaSecondary}</Link>
          </Button>
        </motion.div>

        {/* Key stats */}
        <motion.div
          initial={base}
          animate={into(0.4)}
          className="grid grid-cols-3 gap-6 max-w-lg mx-auto"
        >
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-primary tabular-nums">
                {value}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
