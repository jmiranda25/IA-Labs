import { motion } from "framer-motion";
import { GraduationCap, MessageSquare, Bell } from "lucide-react";
import { useInView } from "./use-in-view";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const benefits = [
  {
    icon: GraduationCap,
    title: "Workshops y eventos",
    body: "Sesiones prácticas mensuales para aprender haciendo.",
  },
  {
    icon: MessageSquare,
    title: "Foro activo",
    body: "Resuelve dudas, comparte avances y aprende en público.",
  },
  {
    icon: Bell,
    title: "Novedades al día",
    body: "Lo más relevante del ecosistema de IA, filtrado y resumido.",
  },
];

export function BenefitsSection() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="benefits-heading"
      className="max-w-6xl mx-auto px-4 sm:px-6 pb-24"
    >
      <div className="text-center mb-12">
        <h2
          id="benefits-heading"
          className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
        >
          Todo lo que necesitas para crecer con IA
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Un ecosistema completo para aprender, conectar y construir.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {benefits.map(({ icon: Icon, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: REDUCED ? 0 : 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
            className="rounded-2xl border border-border bg-card p-8 flex flex-col gap-4 hover:border-primary/40 transition-colors group"
          >
            <div
              aria-hidden="true"
              className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
            >
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
