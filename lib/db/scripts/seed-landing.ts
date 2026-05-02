import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { landingSectionsTable, landingFaqsTable } from "../src/schema/landing";
import { randomUUID } from "crypto";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// ── Sections seed data (verbatim copy from landing components) ───────────────

const SECTIONS = [
  {
    section: "hero",
    orderIndex: 0,
    title: "Construye, aprende y crece con la comunidad de IA más activa.",
    subtitle:
      "Conéctate con builders, founders y profesionales que están creando con IA todos los días. Eventos, recursos, foro y marketplace en un solo lugar.",
    body: null,
    imageUrl: null,
    content: {
      badge: "🤝 Comunidad de IA en español",
      cta_primary: "Unirme gratis",
      cta_secondary: "Ya tengo cuenta",
      stats: [
        { value: "+500", label: "miembros activos" },
        { value: "+20", label: "workshops realizados" },
        { value: "+100", label: "recursos curados" },
      ],
    },
  },
  {
    section: "about",
    orderIndex: 1,
    title: null,
    subtitle: null,
    body: "Somos un espacio para quienes quieren **dejar de mirar la IA desde afuera y empezar a construir con ella**. Compartimos prompts, plantillas, agentes, automatizaciones y aprendizajes reales — sin humo y sin gurús.",
    imageUrl: null,
    content: {},
  },
  {
    section: "benefits",
    orderIndex: 2,
    title: "Todo lo que necesitas para crecer con IA",
    subtitle: "Un ecosistema completo para aprender, conectar y construir.",
    body: null,
    imageUrl: null,
    content: {
      items: [
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
      ],
    },
  },
  {
    section: "who_is_for",
    orderIndex: 3,
    title: "¿Para quién es?",
    subtitle: "Si estás construyendo con IA o quieres empezar, este es tu lugar.",
    body: null,
    imageUrl: null,
    content: {
      profiles: [
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
      ],
    },
  },
  {
    section: "how_it_works",
    orderIndex: 4,
    title: "Cómo funciona",
    subtitle: "Cuatro pasos para pasar de nuevo miembro a parte activa de la comunidad.",
    body: null,
    imageUrl: null,
    content: {
      steps: [
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
        {
          n: "04",
          title: "Crece",
          body: "Aprende, conecta y construye con la comunidad.",
        },
      ],
    },
  },
  {
    section: "testimonials",
    orderIndex: 5,
    title: "Lo que dicen nuestros miembros",
    subtitle: "Personas reales, resultados concretos.",
    body: null,
    imageUrl: null,
    content: {
      items: [
        {
          quote:
            "Aquí encontré la comunidad que no sabía que necesitaba para empezar a construir agentes en serio.",
          name: "Nombre Apellido",
          role: "Founder en [Empresa]",
          initials: "NA",
        },
        {
          quote: "Los workshops valen oro. Aprendí más en un mes que en seis meses solo.",
          name: "Nombre Apellido",
          role: "AI Engineer",
          initials: "NA",
        },
        {
          quote: "El marketplace me trajo mis primeros tres clientes consultando con IA.",
          name: "Nombre Apellido",
          role: "Consultor independiente",
          initials: "NA",
        },
      ],
    },
  },
  {
    section: "cta_final",
    orderIndex: 6,
    title: "Tu próximo proyecto con IA empieza aquí.",
    subtitle: "Únete gratis y empieza a construir con la comunidad hoy mismo.",
    body: null,
    imageUrl: null,
    content: {
      cta_text: "Crear mi cuenta",
      fine_print: "Sin tarjeta de crédito · Gratis para siempre en el núcleo",
    },
  },
];

// ── FAQ seed data (verbatim from faq-section.tsx) ────────────────────────────

const FAQS = [
  {
    question: "¿Qué es esta comunidad y a quién está dirigida?",
    answer:
      "Es una comunidad hispanohablante para personas que construyen, aprenden o trabajan con IA: builders, founders, consultores y profesionales que quieren integrar IA en su día a día. No es un grupo solo de consumo de noticias: el foco está en hacer.",
    orderIndex: 0,
  },
  {
    question: "¿Tiene algún costo unirse?",
    answer:
      "El acceso a la comunidad y al MVP es gratuito. En el futuro podrían existir niveles premium para eventos cerrados o marketplace, pero el núcleo seguirá siendo abierto.",
    orderIndex: 1,
  },
  {
    question: "¿Qué nivel técnico necesito para participar?",
    answer:
      "Ninguno específico. Hay miembros que recién empiezan y otros que ya tienen productos en producción. Lo importante es tener ganas de construir y compartir.",
    orderIndex: 2,
  },
  {
    question: "¿Cómo funcionan los eventos y workshops?",
    answer:
      "Publicamos eventos dentro de la plataforma. Te registras con un clic (RSVP) y recibes el enlace y los recordatorios. La mayoría son online; algunos presenciales por ciudad.",
    orderIndex: 3,
  },
  {
    question: "¿Puedo publicar mis servicios o productos en el marketplace?",
    answer:
      "Sí. Cualquier participante puede crear un listado (servicio, plantilla, agente, curso). Un administrador revisa antes de publicar para mantener la calidad. En el MVP no hay pasarela de pagos: el contacto inicial se hace dentro de la plataforma.",
    orderIndex: 4,
  },
  {
    question: "¿Cómo se modera el foro?",
    answer:
      "Tenemos guías de comunidad simples: respeto, contenido on-topic y cero spam. Los administradores pueden cerrar, fijar o eliminar hilos cuando sea necesario.",
    orderIndex: 5,
  },
  {
    question: "¿Mis datos están seguros?",
    answer:
      "Usamos autenticación con Clerk y políticas de Row Level Security que aseguran que cada usuario solo accede a lo suyo. No vendemos datos a terceros.",
    orderIndex: 6,
  },
  {
    question: "¿Cómo me convierto en colaborador o admin?",
    answer:
      "Los roles de administrador se asignan manualmente desde el panel admin. Si quieres colaborar (organizar eventos, curar recursos, moderar), escríbenos desde tu perfil.",
    orderIndex: 7,
  },
];

async function main() {
  console.log("Seeding landing sections…");

  for (const s of SECTIONS) {
    await db
      .insert(landingSectionsTable)
      .values({
        id: randomUUID(),
        section: s.section,
        title: s.title ?? null,
        subtitle: s.subtitle ?? null,
        body: s.body ?? null,
        imageUrl: s.imageUrl ?? null,
        orderIndex: s.orderIndex,
        enabled: true,
        content: s.content,
      })
      .onConflictDoUpdate({
        target: landingSectionsTable.section,
        set: {
          title: s.title ?? null,
          subtitle: s.subtitle ?? null,
          body: s.body ?? null,
          imageUrl: s.imageUrl ?? null,
          orderIndex: s.orderIndex,
          enabled: true,
          content: s.content,
          updatedAt: new Date(),
        },
      });
    console.log(`  ✓ section: ${s.section}`);
  }

  console.log("Seeding landing FAQs…");

  // Clear and re-insert FAQs for idempotency
  await db.delete(landingFaqsTable);
  for (const f of FAQS) {
    await db.insert(landingFaqsTable).values({
      id: randomUUID(),
      question: f.question,
      answer: f.answer,
      orderIndex: f.orderIndex,
      enabled: true,
    });
    console.log(`  ✓ faq ${f.orderIndex + 1}: ${f.question.slice(0, 40)}…`);
  }

  console.log("Done.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  pool.end();
  process.exit(1);
});
