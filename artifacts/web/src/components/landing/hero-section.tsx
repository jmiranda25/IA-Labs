import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const DEFAULT_TITLE = "Construye, aprende y crece con la comunidad de IA.";
const DEFAULT_SUBTITLE =
  "Conéctate con builders, founders y profesionales que están creando con IA todos los días. Eventos, recursos, foro y marketplace en un solo lugar.";
const DEFAULT_BADGE = "@IALABSPERU · Comunidad de IA en español";
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
  const title = data?.title ?? DEFAULT_TITLE;
  const subtitle = data?.subtitle ?? DEFAULT_SUBTITLE;

  return (
    <div>
      {/* ── Split hero ── */}
      <section
        aria-labelledby="hero-heading"
        className="relative flex min-h-screen overflow-hidden"
      >
        {/* LEFT — editorial content */}
        <div className="relative z-10 flex w-full flex-col justify-center px-8 py-24 sm:px-12 lg:w-[55%] lg:px-16 lg:py-32">
          {/* Pill badge */}
          <motion.div initial={base} animate={into(0)} className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary px-4 py-1 text-xs text-secondary">
              {badge}
            </span>
          </motion.div>

          {/* Editorial headline */}
          <motion.h1
            id="hero-heading"
            initial={base}
            animate={into(0.1)}
            className="mb-8 text-6xl font-thin leading-[1.02] tracking-tight text-foreground lg:text-8xl"
          >
            {title}
          </motion.h1>

          <motion.p
            initial={base}
            animate={into(0.2)}
            className="mb-10 max-w-lg text-base text-muted-foreground sm:text-lg"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={base}
            animate={into(0.3)}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Button size="lg" className="gap-2 rounded-sm text-base" asChild>
              <Link href="/registro">
                {ctaPrimary}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="rounded-sm text-base border border-border/40"
              asChild
            >
              <Link href="/iniciar-sesion">{ctaSecondary}</Link>
            </Button>
          </motion.div>
        </div>

        {/* RIGHT — poster panel */}
        <div className="hidden lg:block lg:w-[45%]">
          <div
            className="relative h-full w-full overflow-hidden rounded-l-[2rem]"
            style={{
              background:
                "linear-gradient(135deg, #1a1040 0%, #0d1b4b 50%, #0a0a1a 100%)",
            }}
          >
            {/* Subtle inner glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 60% 40%, rgba(139,92,246,0.18) 0%, transparent 70%)",
              }}
            />

            {/* Decorative — thin rectangle outline */}
            <div
              aria-hidden="true"
              className="absolute"
              style={{
                top: "10%",
                left: "8%",
                width: "55%",
                height: "50%",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "2px",
              }}
            />

            {/* Decorative — offset second rectangle */}
            <div
              aria-hidden="true"
              className="absolute"
              style={{
                top: "16%",
                left: "14%",
                width: "55%",
                height: "50%",
                border: "1px solid rgba(139,92,246,0.25)",
                borderRadius: "2px",
              }}
            />

            {/* Decorative — large circle arc (clipped top-right) */}
            <div
              aria-hidden="true"
              className="absolute"
              style={{
                bottom: "-15%",
                right: "-15%",
                width: "65%",
                height: "65%",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "50%",
              }}
            />

            {/* Decorative — small circle accent */}
            <div
              aria-hidden="true"
              className="absolute"
              style={{
                top: "58%",
                left: "22%",
                width: "6px",
                height: "6px",
                backgroundColor: "rgba(170,255,0,0.7)",
                borderRadius: "50%",
              }}
            />

            {/* Decorative — horizontal thin line */}
            <div
              aria-hidden="true"
              className="absolute"
              style={{
                bottom: "28%",
                left: "8%",
                width: "40%",
                height: "1px",
                background:
                  "linear-gradient(90deg, rgba(139,92,246,0.6) 0%, transparent 100%)",
              }}
            />

            {/* Small-caps corner labels */}
            <span
              className="absolute bottom-6 left-6 text-xs font-semibold tracking-[0.2em] text-white/60 uppercase"
              aria-hidden="true"
            >
              IA Labs Perú
            </span>
            <span
              className="absolute bottom-6 right-6 text-right text-xs font-semibold tracking-[0.15em] text-white/40 uppercase"
              aria-hidden="true"
            >
              Comunidad de<br />Inteligencia Artificial
            </span>
          </div>
        </div>
      </section>

      {/* ── Stats row ── */}
      <section aria-label="Estadísticas de la comunidad" className="border-y border-border/30">
        <motion.div
          initial={base}
          animate={into(0.45)}
          className="mx-auto flex max-w-4xl divide-x divide-border/30"
        >
          {stats.map(({ value, label }) => (
            <div key={label} className="flex-1 px-6 py-10 text-center sm:px-10">
              <div className="text-5xl font-light tabular-nums text-primary">{value}</div>
              <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                {label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
