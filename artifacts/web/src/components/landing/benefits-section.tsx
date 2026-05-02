import { motion } from "framer-motion";
import { Users, Lightbulb, TrendingUp } from "lucide-react";
import { useInView } from "./use-in-view";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const benefits = [
  {
    icon: Users,
    title: "Red profesional de alto valor",
    body: "Accede a un directorio curado de expertos en IA. Encuentra colaboradores, mentores y clientes con la experiencia exacta que necesitas.",
  },
  {
    icon: Lightbulb,
    title: "Conocimiento compartido",
    body: "Foros temáticos, biblioteca de recursos y eventos en vivo donde la comunidad comparte lo que realmente funciona — sin filtros corporativos.",
  },
  {
    icon: TrendingUp,
    title: "Impulsa tu carrera",
    body: "Publica tus servicios en el marketplace, participa en proyectos abiertos y hazte visible ante empresas que buscan talento en IA.",
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
        <h2 id="benefits-heading" className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          ¿Por qué unirte?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          No es otra red social. Es la plataforma donde ocurre el trabajo real en IA.
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
