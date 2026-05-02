import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useInView } from "./use-in-view";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const profiles = [
  {
    label: "Investigadores y académicos",
    items: [
      "Comparte papers y recibe feedback de pares",
      "Encuentra colaboradores para proyectos",
      "Debate sobre fronteras del estado del arte",
    ],
  },
  {
    label: "Ingenieros y desarrolladores",
    items: [
      "Accede a recursos técnicos curados",
      "Ofrece servicios o busca freelance gigs",
      "Mantente al día con herramientas y frameworks",
    ],
  },
  {
    label: "Emprendedores y founders",
    items: [
      "Conecta con talento especializado en IA",
      "Valida ideas con expertos del sector",
      "Encuentra inversores y co-fundadores",
    ],
  },
  {
    label: "Profesionales en transición",
    items: [
      "Aprende de quienes ya hicieron el camino",
      "Construye tu reputación pública en IA",
      "Accede a ofertas y proyectos exclusivos",
    ],
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 id="forwho-heading" className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            ¿Para quién es AI Community?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Diseñada para todas las personas que trabajan, estudian o construyen con inteligencia artificial.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {profiles.map(({ label, items }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: REDUCED ? 0 : 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
              className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4"
            >
              <h3 className="font-semibold text-foreground text-sm">{label}</h3>
              <ul className="flex flex-col gap-2" role="list">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
