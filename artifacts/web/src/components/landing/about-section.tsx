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
      <strong key={i} className="text-foreground font-semibold">
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
      className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 text-center"
    >
      <motion.p
        initial={{ opacity: 0, y: REDUCED ? 0 : 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="text-base sm:text-lg text-muted-foreground leading-relaxed"
      >
        {parseMarkdownBold(bodyText)}
      </motion.p>
    </section>
  );
}
