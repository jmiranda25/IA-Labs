import { motion } from "framer-motion";
import { useInView } from "./use-in-view";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function AboutSection() {
  const { ref, inView } = useInView(0.15);

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
        Somos un espacio para quienes quieren{" "}
        <strong className="text-foreground font-semibold">
          dejar de mirar la IA desde afuera y empezar a construir con ella
        </strong>
        . Compartimos prompts, plantillas, agentes, automatizaciones y aprendizajes
        reales — sin humo y sin gurús.
      </motion.p>
    </section>
  );
}
