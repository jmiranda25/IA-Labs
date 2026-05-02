import { useInView } from "./use-in-view";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "¿Qué es esta comunidad y a quién está dirigida?",
    a: "Es una comunidad hispanohablante para personas que construyen, aprenden o trabajan con IA: builders, founders, consultores y profesionales que quieren integrar IA en su día a día. No es un grupo solo de consumo de noticias: el foco está en hacer.",
  },
  {
    q: "¿Tiene algún costo unirse?",
    a: "El acceso a la comunidad y al MVP es gratuito. En el futuro podrían existir niveles premium para eventos cerrados o marketplace, pero el núcleo seguirá siendo abierto.",
  },
  {
    q: "¿Qué nivel técnico necesito para participar?",
    a: "Ninguno específico. Hay miembros que recién empiezan y otros que ya tienen productos en producción. Lo importante es tener ganas de construir y compartir.",
  },
  {
    q: "¿Cómo funcionan los eventos y workshops?",
    a: "Publicamos eventos dentro de la plataforma. Te registras con un clic (RSVP) y recibes el enlace y los recordatorios. La mayoría son online; algunos presenciales por ciudad.",
  },
  {
    q: "¿Puedo publicar mis servicios o productos en el marketplace?",
    a: "Sí. Cualquier participante puede crear un listado (servicio, plantilla, agente, curso). Un administrador revisa antes de publicar para mantener la calidad. En el MVP no hay pasarela de pagos: el contacto inicial se hace dentro de la plataforma.",
  },
  {
    q: "¿Cómo se modera el foro?",
    a: "Tenemos guías de comunidad simples: respeto, contenido on-topic y cero spam. Los administradores pueden cerrar, fijar o eliminar hilos cuando sea necesario.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Usamos autenticación con Clerk y políticas de Row Level Security que aseguran que cada usuario solo accede a lo suyo. No vendemos datos a terceros.",
  },
  {
    q: "¿Cómo me convierto en colaborador o admin?",
    a: "Los roles de administrador se asignan manualmente desde el panel admin. Si quieres colaborar (organizar eventos, curar recursos, moderar), escríbenos desde tu perfil.",
  },
];

export function FaqSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="faq-heading"
      className="max-w-3xl mx-auto px-4 sm:px-6 py-24"
    >
      <div className="text-center mb-12">
        <h2
          id="faq-heading"
          className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
        >
          Preguntas frecuentes
        </h2>
        <p className="text-muted-foreground">
          ¿No encuentras tu respuesta? Escríbenos desde tu perfil.
        </p>
      </div>

      <div
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "none" : "translateY(16px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        <Accordion type="single" collapsible className="w-full">
          {faqs.map(({ q, a }, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium text-foreground hover:no-underline hover:text-primary transition-colors py-5">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
