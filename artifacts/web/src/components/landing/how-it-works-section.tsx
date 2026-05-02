import { motion } from "framer-motion";
import { useInView } from "./use-in-view";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const steps = [
  {
    n: "01",
    title: "Crea tu perfil",
    body: "Regístrate en menos de 2 minutos. Describe tus habilidades, intereses y lo que buscas en la comunidad.",
  },
  {
    n: "02",
    title: "Explora y conecta",
    body: "Busca miembros por especialidad, asiste a eventos, lee el foro y descubre recursos que otros han probado.",
  },
  {
    n: "03",
    title: "Participa activamente",
    body: "Abre hilos de debate, comparte recursos, responde preguntas y construye tu reputación como referente.",
  },
  {
    n: "04",
    title: "Haz crecer tu negocio",
    body: "Publica en el marketplace, acepta proyectos freelance y accede a oportunidades que no encontrarás en LinkedIn.",
  },
];

export function HowItWorksSection() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="howitworks-heading"
      className="max-w-6xl mx-auto px-4 sm:px-6 py-24"
    >
      <div className="text-center mb-14">
        <h2 id="howitworks-heading" className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Cómo funciona
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Cuatro pasos para pasar de nuevo miembro a referente de la comunidad.
        </p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Connector line on desktop */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-border"
        />

        {steps.map(({ n, title, body }, i) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, y: REDUCED ? 0 : 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
            className="flex flex-col items-center text-center gap-4 relative z-10"
          >
            <div
              className="h-14 w-14 rounded-full border-2 border-primary bg-background flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-sm font-bold text-primary tabular-nums">{n}</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
