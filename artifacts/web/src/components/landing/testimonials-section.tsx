import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { useInView } from "./use-in-view";

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const testimonials = [
  {
    quote:
      "En tres semanas encontré dos colaboradores para mi startup de visión computacional. Imposible en cualquier otra plataforma.",
    name: "Ana Ruiz",
    role: "Co-fundadora, VisualAI Labs",
    initials: "AR",
    color: "from-primary/30 to-primary/10",
  },
  {
    quote:
      "El foro tiene un nivel técnico que no encontré ni en Slack ni en Discord. Las discusiones son serias y las respuestas, rápidas.",
    name: "Carlos Méndez",
    role: "ML Engineer, Freelance",
    initials: "CM",
    color: "from-[hsl(190_100%_50%)]/30 to-[hsl(190_100%_50%)]/10",
  },
  {
    quote:
      "Publiqué un servicio de fine-tuning el primer día y tuve tres clientes en menos de un mes. El marketplace realmente funciona.",
    name: "Laura Pinto",
    role: "AI Consultant",
    initials: "LP",
    color: "from-primary/30 to-[hsl(190_100%_50%)]/10",
  },
];

export function TestimonialsSection() {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="testimonials-heading"
      className="bg-card/40 border-y border-border py-24"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 id="testimonials-heading" className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Lo que dicen nuestros miembros
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Personas reales, resultados concretos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(({ quote, name, role, initials, color }, i) => (
            <motion.figure
              key={name}
              initial={{ opacity: 0, y: REDUCED ? 0 : 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card p-8 flex flex-col gap-6"
              aria-label={`Testimonio de ${name}`}
            >
              <Quote className="h-5 w-5 text-primary/60 shrink-0" aria-hidden="true" />
              <blockquote>
                <p className="text-foreground/90 leading-relaxed text-sm">"{quote}"</p>
              </blockquote>
              <figcaption className="flex items-center gap-3 mt-auto">
                <div
                  aria-hidden="true"
                  className={`h-10 w-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}
                >
                  <span className="text-xs font-bold text-foreground">{initials}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{name}</div>
                  <div className="text-xs text-muted-foreground">{role}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
