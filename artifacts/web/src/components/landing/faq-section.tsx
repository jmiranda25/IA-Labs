import { useInView } from "./use-in-view";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "¿Es gratuito unirse?",
    a: "Sí. La membresía básica es completamente gratuita e incluye acceso al directorio, foro, eventos públicos y recursos. En el futuro existirán planes premium con funcionalidades adicionales.",
  },
  {
    q: "¿Qué nivel técnico se requiere?",
    a: "Ninguno en particular. Tenemos miembros desde estudiantes hasta doctores y CTOs de empresas Fortune 500. Lo importante es el interés genuino por la inteligencia artificial.",
  },
  {
    q: "¿Puedo publicar ofertas de trabajo o servicios?",
    a: "Sí. El marketplace está abierto a todos los miembros registrados. Puedes publicar servicios que ofreces, proyectos en los que buscas colaboradores o posiciones abiertas en tu empresa.",
  },
  {
    q: "¿Cómo se modera el contenido?",
    a: "Contamos con un equipo de moderadores y administradores que revisan el contenido. También disponemos de herramientas de reporte comunitario. Seguimos un código de conducta estricto que prioriza el respeto y la calidad técnica.",
  },
  {
    q: "¿Los eventos son presenciales o virtuales?",
    a: "Ambos. Organizamos meetups virtuales semanales, talleres online y, cuando es posible, eventos presenciales en distintas ciudades. Puedes filtrar por formato en la sección de eventos.",
  },
  {
    q: "¿Puedo conectar con miembros de forma privada?",
    a: "Sí. El sistema de mensajería directa está disponible para todos los miembros verificados. Puedes iniciar conversaciones desde el perfil de cualquier usuario.",
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
          ¿No encuentras tu respuesta? Escríbenos por el foro de soporte.
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
              <AccordionTrigger className="text-left text-base font-medium text-foreground hover:no-underline hover:text-primary transition-colors">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
