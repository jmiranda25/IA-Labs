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
      className="max-w-6xl mx-auto px-4 sm:px-6 pb-24"
    >
      <div className="text-center mb-12">
        <h2
          id="benefits-heading"
          className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
        >
          {title}
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {items.map(({ icon, title: itemTitle, body }, i) => {
          const Icon = ICON_MAP[icon] ?? GraduationCap;
          return (
            <motion.div
              key={itemTitle}
              initial={{ opacity: 0, y: REDUCED ? 0 : 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
              className="flex flex-col gap-4"
            >
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="font-medium text-white">{itemTitle}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{body}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
