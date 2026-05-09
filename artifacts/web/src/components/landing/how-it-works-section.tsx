import { motion } from "framer-motion";
import type { LandingSection } from "@workspace/api-client-react";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const DEFAULT_TITLE = "Cómo funciona";
const DEFAULT_SUBTITLE =
  "Cuatro pasos para pasar de nuevo miembro a parte activa de la comunidad.";
const DEFAULT_STEPS = [
  { n: "01", title: "Regístrate gratis", body: "Con tu email, en menos de un minuto." },
  {
    n: "02",
    title: "Completa tu perfil",
    body: "Con tus intereses en IA para conectar con quien te complementa.",
  },
  {
    n: "03",
    title: "Participa",
    body: "Foro, eventos, marketplace, recursos — todo en un solo lugar.",
  },
  { n: "04", title: "Crece", body: "Aprende, conecta y construye con la comunidad." },
];

interface Step {
  n: string;
  title: string;
  body: string;
}

interface HowItWorksSectionProps {
  data?: LandingSection | null;
}

export function HowItWorksSection({ data }: HowItWorksSectionProps) {
  const c = (data?.content ?? {}) as Record<string, unknown>;
  const title = data?.title ?? DEFAULT_TITLE;
  const subtitle = data?.subtitle ?? DEFAULT_SUBTITLE;
  const rawSteps = c.steps as Step[] | undefined;
  const steps =
    Array.isArray(rawSteps) && rawSteps.length > 0 ? rawSteps : DEFAULT_STEPS;

  return (
    <section
      aria-labelledby="howitworks-heading"
      className="max-w-6xl mx-auto px-4 sm:px-6 py-24"
    >
      <div className="text-center mb-14">
        <h2
          id="howitworks-heading"
          className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
        >
          {title}
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">{subtitle}</p>
      </div>

      <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Connector line on desktop */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-border"
        />

        {steps.map(({ n, title: stepTitle, body }, i) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, y: REDUCED ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
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
              <h3 className="font-semibold text-foreground mb-1">{stepTitle}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
