import { motion } from "framer-motion";
import { useInView } from "./use-in-view";
import type { LandingSection } from "@workspace/api-client-react";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const DEFAULT_BODY =
  "Somos un espacio para quienes quieren **dejar de mirar la IA desde afuera y empezar a construir con ella**. Compartimos prompts, plantillas, agentes, automatizaciones y aprendizajes reales — sin humo y sin gurús.";

function parseMarkdownBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-foreground font-normal">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

interface AboutSectionProps {
  data?: LandingSection | null;
}

export function AboutSection({ data }: AboutSectionProps) {
  const { ref, inView } = useInView(0.15);
  const bodyText = data?.body ?? DEFAULT_BODY;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="about-heading"
      className="border-t border-border/30 max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-20"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-20 items-start">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Sobre nosotros
          </span>
        </div>
        <motion.p
          initial={{ opacity: 0, y: REDUCED ? 0 : 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-xl sm:text-2xl font-extralight leading-relaxed text-muted-foreground max-w-2xl"
        >
          {parseMarkdownBold(bodyText)}
        </motion.p>
      </div>
    </section>
  );
}
