import { motion } from "framer-motion";
import { useInView } from "./use-in-view";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const profiles = [
  {
    emoji: "🛠️",
    label: "Builders de IA",
    body: "Que crean agentes, automatizaciones o productos.",
  },
  {
    emoji: "🚀",
    label: "Founders y emprendedores",
    body: "Que quieren integrar IA en su negocio.",
  },
  {
    emoji: "🎯",
    label: "Profesionales en transición",
    body: "Que buscan re-skillearse con IA.",
  },
];

export function ForWhoSection() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="forwho-heading"
      className="bg-card/40 border-y border-border py-24"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2
            id="forwho-heading"
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
          >
            ¿Para quién es?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Si estás construyendo con IA o quieres empezar, este es tu lugar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {profiles.map(({ emoji, label, body }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: REDUCED ? 0 : 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: i * 0.12, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center text-center gap-4"
            >
              <span className="text-4xl" role="img" aria-label={label}>
                {emoji}
              </span>
              <h3 className="font-semibold text-foreground">{label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
