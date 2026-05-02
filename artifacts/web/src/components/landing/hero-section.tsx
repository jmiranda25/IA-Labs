import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const base = { opacity: 0, y: REDUCED ? 0 : 24 };
const into = (delay: number) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: "easeOut" as const } });

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32 text-center px-4"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-start justify-center"
      >
        <div className="h-[600px] w-[900px] rounded-full bg-primary/10 blur-[120px] -translate-y-1/3" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        <motion.div initial={base} animate={into(0)}>
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs inline-flex">
            <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
            La comunidad de referencia para profesionales de IA
          </Badge>
        </motion.div>

        <motion.h1
          id="hero-heading"
          initial={base}
          animate={into(0.1)}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6"
        >
          Conecta, colabora y{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[hsl(190_100%_50%)]">
            crece en IA
          </span>
        </motion.h1>

        <motion.p
          initial={base}
          animate={into(0.2)}
          className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
        >
          Más de 1&nbsp;000 constructores, investigadores y entusiastas que empujan los
          límites de la inteligencia artificial — todo en un mismo lugar.
        </motion.p>

        <motion.div
          initial={base}
          animate={into(0.3)}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button size="lg" className="gap-2 text-base" asChild>
            <Link href="/registro">
              Únete gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base" asChild>
            <Link href="/sign-in">Ya tengo cuenta</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
