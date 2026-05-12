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
      className="border-t border-border/30"
    >
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-20 mb-16">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Proceso
            </span>
          </div>
          <div>
            <h2
              id="howitworks-heading"
              className="text-4xl sm:text-5xl font-extralight leading-none tracking-tight text-white mb-4"
            >
              {title}
            </h2>
            <p className="text-muted-foreground max-w-lg">{subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 border-t border-border/30">
          {steps.map(({ n, title: stepTitle, body }, i) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: REDUCED ? 0 : 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
              className="border-b md:border-b-0 md:border-r border-border/30 last:border-0 pt-10 pr-0 md:pr-8 pb-10 flex flex-col gap-8"
            >
              <span
                className="text-6xl font-extralight tabular-nums text-white/10 leading-none select-none"
                aria-hidden="true"
              >
                {n}
              </span>
              <div>
                <h3 className="text-sm font-medium text-white uppercase tracking-widest mb-3">
                  {stepTitle}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
