import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const base = { opacity: 0, y: REDUCED ? 0 : 24 };
const into = (delay: number) => ({
  opacity: 1,
  y: 0,
  transition: { duration: 0.55, delay, ease: "easeOut" as const },
});

export function HeroSection() {
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
            <span aria-hidden="true">🤝</span>
            Comunidad de IA en español
          </Badge>
        </motion.div>

        <motion.h1
          id="hero-heading"
          initial={base}
          animate={into(0.1)}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6"
        >
          Construye, aprende y crece con la{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[hsl(190_100%_50%)]">
            comunidad de IA más activa.
          </span>
        </motion.h1>

        <motion.p
          initial={base}
          animate={into(0.2)}
          className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
        >
          Conéctate con builders, founders y profesionales que están creando con IA
          todos los días. Eventos, recursos, foro y marketplace en un solo lugar.
        </motion.p>

        <motion.div
          initial={base}
          animate={into(0.3)}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <Button size="lg" className="gap-2 text-base" asChild>
            <Link href="/registro">
              Unirme gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base" asChild>
            <Link href="/sign-in">Ya tengo cuenta</Link>
          </Button>
        </motion.div>

        {/* Key stats */}
        <motion.div
          initial={base}
          animate={into(0.4)}
          className="grid grid-cols-3 gap-6 max-w-lg mx-auto"
        >
          {[
            { value: "+500", label: "miembros activos" },
            { value: "+20", label: "workshops realizados" },
            { value: "+100", label: "recursos curados" },
          ].map(({ value, label }) => (
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
