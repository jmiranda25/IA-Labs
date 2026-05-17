import { motion } from "framer-motion";
import type { LandingSection } from "@workspace/api-client-react";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const DEFAULT_TITLE = "¿Para quién es?";
const DEFAULT_SUBTITLE = "Si estás construyendo con IA o quieres empezar, este es tu lugar.";
const DEFAULT_PROFILES = [
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

interface Profile {
  emoji: string;
  label: string;
  body: string;
}

interface ForWhoSectionProps {
  data?: LandingSection | null;
}

export function ForWhoSection({ data }: ForWhoSectionProps) {
  const c = (data?.content ?? {}) as Record<string, unknown>;
  const title = data?.title ?? DEFAULT_TITLE;
  const subtitle = data?.subtitle ?? DEFAULT_SUBTITLE;
  const rawProfiles = c.profiles as Profile[] | undefined;
  const profiles =
    Array.isArray(rawProfiles) && rawProfiles.length > 0
      ? rawProfiles
      : DEFAULT_PROFILES;

  return (
    <section
      aria-labelledby="forwho-heading"
      className="border-t border-border/30"
    >
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-20 mb-16">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Para quién
            </span>
          </div>
          <div>
            <h2
              id="forwho-heading"
              className="text-4xl sm:text-5xl font-extralight leading-none tracking-tight text-white mb-4"
            >
              {title}
            </h2>
            <p className="text-muted-foreground max-w-lg">{subtitle}</p>
          </div>
        </div>

        <div className="border-t border-border/30">
          {profiles.map(({ emoji, label, body }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: REDUCED ? 0 : -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
              className="grid grid-cols-[auto_1fr] lg:grid-cols-[1fr_2fr] gap-6 lg:gap-20 border-b border-border/30 py-8 items-start"
            >
              <div className="flex items-center gap-4 lg:gap-0">
                <span
                  className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 tabular-nums w-8 shrink-0"
                  aria-hidden="true"
                >
                  0{i + 1}
                </span>
                <span
                  className="text-2xl lg:hidden"
                  role="img"
                  aria-label={label}
                >
                  {emoji}
                </span>
              </div>
              <div className="flex items-start gap-8">
                <span
                  className="hidden lg:block text-3xl shrink-0 mt-1"
                  role="img"
                  aria-label={label}
                >
                  {emoji}
                </span>
                <div>
                  <h3 className="text-base font-medium text-white uppercase tracking-widest mb-2">
                    {label}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
