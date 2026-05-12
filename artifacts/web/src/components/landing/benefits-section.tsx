import { motion } from "framer-motion";
import { GraduationCap, MessageSquare, Bell, type LucideIcon } from "lucide-react";
import type { LandingSection } from "@workspace/api-client-react";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ICON_MAP: Record<string, LucideIcon> = {
  GraduationCap,
  MessageSquare,
  Bell,
};

const DEFAULT_TITLE = "Todo lo que necesitas para crecer con IA";
const DEFAULT_SUBTITLE = "Un ecosistema completo para aprender, conectar y construir.";
const DEFAULT_ITEMS = [
  {
    icon: "GraduationCap",
    title: "Workshops y eventos",
    body: "Sesiones prácticas mensuales para aprender haciendo.",
  },
  {
    icon: "MessageSquare",
    title: "Foro activo",
    body: "Resuelve dudas, comparte avances y aprende en público.",
  },
  {
    icon: "Bell",
    title: "Novedades al día",
    body: "Lo más relevante del ecosistema de IA, filtrado y resumido.",
  },
];

interface BenefitItem {
  icon: string;
  title: string;
  body: string;
}

interface BenefitsSectionProps {
  data?: LandingSection | null;
}

export function BenefitsSection({ data }: BenefitsSectionProps) {
  const c = (data?.content ?? {}) as Record<string, unknown>;
  const title = data?.title ?? DEFAULT_TITLE;
  const subtitle = data?.subtitle ?? DEFAULT_SUBTITLE;
  const rawItems = c.items as BenefitItem[] | undefined;
  const items =
    Array.isArray(rawItems) && rawItems.length > 0 ? rawItems : DEFAULT_ITEMS;

  return (
    <section
      aria-labelledby="benefits-heading"
      className="border-t border-border/30 max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-24"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-20 mb-16">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Beneficios
          </span>
        </div>
        <div>
          <h2
            id="benefits-heading"
            className="text-4xl sm:text-5xl font-extralight leading-none tracking-tight text-white mb-4"
          >
            {title}
          </h2>
          <p className="text-muted-foreground max-w-lg">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-border/30">
        {items.map(({ icon, title: itemTitle, body }, i) => {
          const Icon = ICON_MAP[icon] ?? GraduationCap;
          return (
            <motion.div
              key={itemTitle}
              initial={{ opacity: 0, y: REDUCED ? 0 : 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
              className="border-b md:border-b-0 md:border-r border-border/30 last:border-0 pt-10 pr-0 md:pr-10 pb-10 flex flex-col gap-6"
            >
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-medium text-white uppercase tracking-widest mb-3">
                  {itemTitle}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">{body}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
