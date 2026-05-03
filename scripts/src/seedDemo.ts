/**
 * Seed demo data: 10 users (2 admins + 8 participants) + content.
 *
 * Required env vars:
 *   CLERK_SECRET_KEY  — Clerk secret key
 *   DATABASE_URL      — Postgres connection string
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run seed:demo -- --yes
 *   pnpm --filter @workspace/scripts run seed:demo:clean
 *
 * Idempotency: safe to run multiple times. Content uses deterministic IDs.
 * Pass --clean to delete all @aicomunidad.dev users and their content.
 *
 * ID model: demo users are inserted with users.id = Clerk user ID so that
 * every FK column (resources.author_id, marketplace_listings.seller_id,
 * listing_messages.from_id/to_id) and every non-FK owner column
 * (forum_threads.author_id, events.created_by, rsvps.user_id,
 * notifications.user_id) all store the same Clerk user ID.
 * This makes the clean() subquery trivially consistent across all tables:
 *   WHERE col IN (SELECT id FROM users WHERE email LIKE '%@aicomunidad.dev')
 */

import { createClerkClient } from "@clerk/backend";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import { cleanWithDeps } from "./seedDemoClean.js";

// ─── Env guards ───────────────────────────────────────────────────────────────

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY is required");
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const args = process.argv.slice(2);
const isClean = args.includes("--clean");
const isYes = args.includes("--yes");

if (!isYes && !isClean) {
  console.warn(`
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  DEMO SEED WARNING                                       ║
║                                                              ║
║  This script will create 10 Clerk users + DB content.        ║
║  Run with --yes to confirm you want to proceed.              ║
║                                                              ║
║  pnpm --filter @workspace/scripts run seed:demo -- --yes     ║
╚══════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

// ─── Deterministic ID helper ──────────────────────────────────────────────────

function deterministicId(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

// ─── Personas ─────────────────────────────────────────────────────────────────
//
// USERNAME CONVENTION — read this before adding new demo users:
//
//   Format : firstname_lastname   (snake_case, all lowercase)
//   Rule   : strip all diacritics before lowercasing
//              "Lucía"     → "lucia"
//              "María"     → "maria"
//              "Andrés"    → "andres"
//              "Fernández" → "fernandez"
//   Regex  : must satisfy ^[a-z0-9_]{3,24}$ (DB UNIQUE constraint)
//            — no spaces, hyphens, or accented characters allowed
//            — verify the result manually before adding a new persona
//
//   Collision rule: if two demo users share a first name, append _demo
//   to the first-name part:
//              "maria_garcia"  vs a second María → "maria2_[lastname]"
//   Practically: just pick a different first+last combination.
//
//   Usernames are intentionally STATIC strings in this array — do not
//   generate them at runtime. Static values are reviewed once and stay
//   correct across re-runs; generated values silently break if the rule
//   has an edge case.

const DEMO_PASSWORD = "Demo2026!";
const DOMAIN = "@aicomunidad.dev";

const PERSONAS = [
  {
    email: `lucia.mendez${DOMAIN}`,
    username: "lucia_mendez",
    displayName: "Lucía Méndez",
    role: "administrator" as const,
    bio: "Co-fundadora de AI Comunidad. Apasionada por hacer la IA accesible para todos.",
    location: "Ciudad de México, MX",
    skills: ["LLMs", "Product Strategy", "Community Building"],
  },
  {
    email: `sofia.torres${DOMAIN}`,
    username: "sofia_torres",
    displayName: "Sofía Torres",
    role: "administrator" as const,
    bio: "Investigadora de ML y educadora. Construyendo puentes entre academia e industria.",
    location: "Buenos Aires, AR",
    skills: ["Machine Learning", "NLP", "Python"],
  },
  {
    email: `carlos.reyes${DOMAIN}`,
    username: "carlos_reyes",
    displayName: "Carlos Reyes",
    role: "participant" as const,
    bio: "Indie hacker construyendo en público. Fan de LangChain y Supabase.",
    location: "Bogotá, CO",
    skills: ["LangChain", "TypeScript", "Supabase"],
  },
  {
    email: `maria.garcia${DOMAIN}`,
    username: "maria_garcia",
    displayName: "María García",
    role: "participant" as const,
    bio: "Data scientist en fintech. Explorando el uso de LLMs para análisis de riesgo.",
    location: "Lima, PE",
    skills: ["Python", "Data Analysis", "Risk Modeling"],
  },
  {
    email: `andres.lopez${DOMAIN}`,
    username: "andres_lopez",
    displayName: "Andrés López",
    role: "participant" as const,
    bio: "Full-stack dev aprendiendo a integrar IA en apps web.",
    location: "Santiago, CL",
    skills: ["React", "Node.js", "OpenAI API"],
  },
  {
    email: `valentina.ruiz${DOMAIN}`,
    username: "valentina_ruiz",
    displayName: "Valentina Ruiz",
    role: "participant" as const,
    bio: "UX designer enfocada en crear interfaces humanas para productos de IA.",
    location: "Medellín, CO",
    skills: ["UX Design", "Figma", "AI Products"],
  },
  {
    email: `diego.fernandez${DOMAIN}`,
    username: "diego_fernandez",
    displayName: "Diego Fernández",
    role: "participant" as const,
    bio: "Emprendedor serial. Actualmente construyendo un SaaS de automatización con IA.",
    location: "Montevideo, UY",
    skills: ["Automation", "No-code", "GPT-4"],
  },
  {
    email: `camila.vargas${DOMAIN}`,
    username: "camila_vargas",
    displayName: "Camila Vargas",
    role: "participant" as const,
    bio: "Periodista de tecnología convertida en prompt engineer.",
    location: "Caracas, VE",
    skills: ["Prompt Engineering", "Content Strategy", "AI Writing"],
  },
  {
    email: `roberto.silva${DOMAIN}`,
    username: "roberto_silva",
    displayName: "Roberto Silva",
    role: "participant" as const,
    bio: "DevOps engineer interesado en MLOps y despliegue de modelos a producción.",
    location: "São Paulo, BR",
    skills: ["MLOps", "Docker", "Kubernetes", "Python"],
  },
  {
    email: `isabel.ponce${DOMAIN}`,
    username: "isabel_ponce",
    displayName: "Isabel Ponce",
    role: "participant" as const,
    bio: "Profesora universitaria de informática. Integrando IA generativa en el aula.",
    location: "Quito, EC",
    skills: ["Education", "Generative AI", "Curriculum Design"],
  },
];

// ─── Idempotent user creation ─────────────────────────────────────────────────
//
// users.id is set to the Clerk user ID so every content table — regardless of
// whether it stores the value in an FK column or a plain text column — uses the
// same identifier.  The clean() helper can therefore use a single pattern:
//   WHERE col IN (SELECT id FROM users WHERE email LIKE '%@aicomunidad.dev')

interface SeededUser {
  id: string;   // Clerk user ID = users.id for demo users
  email: string;
  displayName: string;
  role: string;
}

async function idempotentCreateUser(persona: (typeof PERSONAS)[0]): Promise<SeededUser> {
  const { email, username, displayName, role, bio, location, skills } = persona;

  let clerkId: string;

  const existing = await clerk.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });

  if (existing.data.length > 0) {
    clerkId = existing.data[0].id;
    console.log(`  ↩  ${displayName} already in Clerk (${clerkId})`);
  } else {
    const created = await clerk.users.createUser({
      emailAddress: [email],
      password: DEMO_PASSWORD,
      skipPasswordChecks: true,
    });
    clerkId = created.id;
    console.log(`  ✚  Created ${displayName} in Clerk (${clerkId})`);
  }

  await clerk.users.updateUserMetadata(clerkId, {
    publicMetadata: { role },
  });

  const avatarUrl = `https://i.pravatar.cc/300?u=${encodeURIComponent(email)}`;

  // Use Clerk ID as users.id so all content columns resolve to a single value.
  // ON CONFLICT (clerk_id) handles re-runs gracefully.
  await db.execute(sql`
    INSERT INTO users (id, clerk_id, email, username, display_name, bio, avatar_url, role, skills, location, joined_at, updated_at)
    VALUES (
      ${clerkId}, ${clerkId}, ${email}, ${username}, ${displayName},
      ${bio ?? null}, ${avatarUrl}, ${role},
      ${JSON.stringify(skills)}::jsonb, ${location ?? null},
      NOW(), NOW()
    )
    ON CONFLICT (clerk_id) DO UPDATE SET
      id           = EXCLUDED.id,
      display_name = EXCLUDED.display_name,
      bio          = EXCLUDED.bio,
      avatar_url   = EXCLUDED.avatar_url,
      role         = EXCLUDED.role,
      skills       = EXCLUDED.skills,
      location     = EXCLUDED.location,
      updated_at   = NOW()
  `);

  return { id: clerkId, email, displayName, role };
}

// ─── Seed events ──────────────────────────────────────────────────────────────

async function seedEvents(users: SeededUser[]) {
  const lucia = users.find((u) => u.email.startsWith("lucia"))!;
  const sofia = users.find((u) => u.email.startsWith("sofia"))!;

  const now = Date.now();
  const day = 86_400_000;

  const events = [
    {
      slug: "demo:webinar-llms-2026-01",
      title: "Introducción a LLMs para Developers",
      description:
        "Una sesión práctica para entender cómo funcionan los modelos de lenguaje grandes y cómo integrarlos en tus apps.",
      startsAt: new Date(now - 14 * day),
      endsAt: new Date(now - 14 * day + 2 * 3_600_000),
      isOnline: true,
      meetingUrl: "https://meet.example.com/llms-intro",
      createdBy: lucia.id,
    },
    {
      slug: "demo:workshop-langchain-2026-02",
      title: "Workshop: Agentes con LangChain",
      description:
        "Construye tu primer agente autónomo usando LangChain y herramientas externas. Sesión hands-on.",
      startsAt: new Date(now - 7 * day),
      endsAt: new Date(now - 7 * day + 3 * 3_600_000),
      isOnline: true,
      meetingUrl: "https://meet.example.com/langchain-agents",
      createdBy: sofia.id,
    },
    {
      slug: "demo:meetup-cdmx-2026-03",
      title: "AI Comunidad Meetup CDMX",
      description:
        "Encuentro presencial en la Ciudad de México. Networking, demos y charlas cortas de 5 minutos.",
      startsAt: new Date(now + 5 * day),
      endsAt: new Date(now + 5 * day + 4 * 3_600_000),
      isOnline: false,
      location: "WeWork Reforma 26, Ciudad de México",
      capacity: 80,
      coverUrl: "https://picsum.photos/seed/event-meetup-cdmx/1200/630",
      createdBy: lucia.id,
    },
    {
      slug: "demo:conference-ai-latam-2026-04",
      title: "AI LATAM Conference 2026",
      description:
        "La conferencia más grande de inteligencia artificial en América Latina. Keynotes, paneles y workshops durante 2 días.",
      startsAt: new Date(now + 21 * day),
      endsAt: new Date(now + 23 * day),
      isOnline: false,
      location: "Centro de Convenciones, Buenos Aires",
      capacity: 500,
      coverUrl: "https://picsum.photos/seed/event-ai-latam/1200/630",
      createdBy: sofia.id,
    },
  ];

  for (const ev of events) {
    const id = deterministicId(`demo:event:${ev.slug}`);
    await db.execute(sql`
      INSERT INTO events (id, title, slug, description, starts_at, ends_at, location, capacity, is_online, meeting_url, cover_url, created_by, created_at, updated_at)
      VALUES (
        ${id}, ${ev.title}, ${ev.slug}, ${ev.description},
        ${ev.startsAt.toISOString()}, ${ev.endsAt.toISOString()},
        ${(ev as { location?: string }).location ?? null},
        ${(ev as { capacity?: number }).capacity ?? null},
        ${ev.isOnline}, ${(ev as { meetingUrl?: string }).meetingUrl ?? null},
        ${(ev as { coverUrl?: string }).coverUrl ?? null},
        ${ev.createdBy}, NOW(), NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        title       = EXCLUDED.title,
        description = EXCLUDED.description,
        updated_at  = NOW()
    `);
    console.log(`  ✔  Event: ${ev.title}`);
  }

  const eventIds = events.map((ev) => deterministicId(`demo:event:${ev.slug}`));

  const rsvpPairs: Array<[string, string]> = [
    [eventIds[0]!, users.find((u) => u.email.startsWith("carlos"))!.id],
    [eventIds[0]!, users.find((u) => u.email.startsWith("maria"))!.id],
    [eventIds[0]!, users.find((u) => u.email.startsWith("andres"))!.id],
    [eventIds[1]!, users.find((u) => u.email.startsWith("carlos"))!.id],
    [eventIds[1]!, users.find((u) => u.email.startsWith("valentina"))!.id],
    [eventIds[2]!, users.find((u) => u.email.startsWith("diego"))!.id],
    [eventIds[2]!, users.find((u) => u.email.startsWith("camila"))!.id],
    [eventIds[2]!, users.find((u) => u.email.startsWith("roberto"))!.id],
    [eventIds[3]!, users.find((u) => u.email.startsWith("isabel"))!.id],
    [eventIds[3]!, users.find((u) => u.email.startsWith("maria"))!.id],
  ];

  for (const [eventId, userId] of rsvpPairs) {
    const rsvpId = deterministicId(`demo:rsvp:${eventId}:${userId}`);
    await db.execute(sql`
      INSERT INTO rsvps (id, event_id, user_id, status, created_at, updated_at)
      VALUES (${rsvpId}, ${eventId}, ${userId}, 'going', NOW(), NOW())
      ON CONFLICT (event_id, user_id) DO NOTHING
    `);
  }

  return eventIds.length;
}

// ─── Seed resources ───────────────────────────────────────────────────────────

async function seedResources(users: SeededUser[]) {
  const lucia = users.find((u) => u.email.startsWith("lucia"))!;
  const sofia = users.find((u) => u.email.startsWith("sofia"))!;
  const carlos = users.find((u) => u.email.startsWith("carlos"))!;
  const isabel = users.find((u) => u.email.startsWith("isabel"))!;

  const resources = [
    {
      slug: "demo-guia-prompt-engineering",
      title: "Guía Definitiva de Prompt Engineering",
      type: "link" as const,
      url: "https://www.promptingguide.ai/es",
      description: "La guía más completa sobre técnicas de prompting: zero-shot, few-shot, CoT y más.",
      coverUrl: "https://picsum.photos/seed/resource-prompt/800/450",
      authorId: lucia.id,
      tags: ["prompting", "LLMs", "guía"],
    },
    {
      slug: "demo-plantilla-mvp-ia",
      title: "Plantilla MVP para Apps de IA",
      type: "file" as const,
      url: "https://github.com/example/ai-mvp-template",
      description: "Plantilla lista para producción con FastAPI, React y OpenAI. Incluye auth, rate limiting y logging.",
      coverUrl: "https://picsum.photos/seed/resource-mvp/800/450",
      authorId: carlos.id,
      tags: ["template", "FastAPI", "React", "OpenAI"],
    },
    {
      slug: "demo-curso-ml-desde-cero",
      title: "Machine Learning desde Cero",
      type: "course" as const,
      url: "https://example.com/curso-ml",
      description: "Curso completo de ML en español: regresión, clasificación, redes neuronales y despliegue.",
      coverUrl: "https://picsum.photos/seed/resource-ml-course/800/450",
      authorId: sofia.id,
      tags: ["machine learning", "Python", "curso", "español"],
    },
    {
      slug: "demo-video-rag-explicado",
      title: "RAG Explicado en 20 Minutos",
      type: "link" as const,
      url: "https://www.youtube.com/watch?v=example-rag",
      description: "Video tutorial que explica Retrieval-Augmented Generation con ejemplos prácticos en Python.",
      coverUrl: "https://picsum.photos/seed/resource-rag/800/450",
      authorId: sofia.id,
      tags: ["RAG", "Python", "vector databases"],
    },
    {
      slug: "demo-herramienta-langsmith",
      title: "LangSmith para Debugging de LLMs",
      type: "link" as const,
      url: "https://smith.langchain.com",
      description: "Guía práctica de LangSmith para observabilidad, debugging y evaluación de aplicaciones LLM.",
      coverUrl: "https://picsum.photos/seed/resource-langsmith/800/450",
      authorId: carlos.id,
      tags: ["LangSmith", "debugging", "observabilidad"],
    },
    {
      slug: "demo-curso-ia-aula",
      title: "IA Generativa en el Aula: Guía para Docentes",
      type: "course" as const,
      url: "https://example.com/ia-docentes",
      description: "Recursos y estrategias para integrar IA generativa en entornos educativos de forma ética y efectiva.",
      coverUrl: "https://picsum.photos/seed/resource-education/800/450",
      authorId: isabel.id,
      tags: ["educación", "ética", "generative AI"],
    },
  ];

  for (const r of resources) {
    const id = deterministicId(`demo:resource:${r.slug}`);
    await db.execute(sql`
      INSERT INTO resources (id, author_id, title, slug, type, url, description, cover_url, published, created_at)
      VALUES (
        ${id}, ${r.authorId}, ${r.title}, ${r.slug}, ${r.type},
        ${r.url}, ${r.description}, ${r.coverUrl}, true, NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        title       = EXCLUDED.title,
        description = EXCLUDED.description,
        published   = true
    `);

    for (const tag of r.tags) {
      await db.execute(sql`
        INSERT INTO resource_tags (id, resource_id, tag)
        VALUES (${deterministicId(`demo:resource-tag:${r.slug}:${tag}`)}, ${id}, ${tag})
        ON CONFLICT (resource_id, tag) DO NOTHING
      `);
    }

    console.log(`  ✔  Resource: ${r.title}`);
  }

  return resources.length;
}

// ─── Seed forum ───────────────────────────────────────────────────────────────

async function seedForum(users: SeededUser[]) {
  const lucia = users.find((u) => u.email.startsWith("lucia"))!;
  const sofia = users.find((u) => u.email.startsWith("sofia"))!;
  const carlos = users.find((u) => u.email.startsWith("carlos"))!;
  const maria = users.find((u) => u.email.startsWith("maria"))!;
  const andres = users.find((u) => u.email.startsWith("andres"))!;
  const valentina = users.find((u) => u.email.startsWith("valentina"))!;
  const diego = users.find((u) => u.email.startsWith("diego"))!;
  const camila = users.find((u) => u.email.startsWith("camila"))!;

  // Query categories dynamically so the script works with any category configuration.
  const catRows = await db.execute<{ id: string; slug: string }>(sql`
    SELECT id, slug FROM forum_categories ORDER BY order_index
  `);
  if (catRows.rows.length === 0) {
    throw new Error(
      "No forum categories found in the database. " +
      "Run the database migrations first so forum_categories is populated before seeding."
    );
  }
  const catMap = Object.fromEntries(catRows.rows.map((r) => [r.slug, r.id]));

  // Build a helper that returns the best-match category id or the first available.
  const firstCatId = catRows.rows[0]!.id;
  function cat(...slugs: string[]): string {
    for (const s of slugs) {
      if (catMap[s]) return catMap[s]!;
    }
    return firstCatId;
  }

  // 8 threads spread across whatever categories exist in the DB
  const threads = [
    {
      slug: "demo-bienvenidos-comunidad",
      categoryId: cat("general", "off-topic", "anuncios"),
      authorId: lucia.id,
      title: "¡Bienvenidos a AI Comunidad! Preséntate aquí",
      body: "¡Hola a todos! 👋 Somos una comunidad de builders, investigadores y entusiastas de la IA en LATAM. Este es el hilo oficial de presentaciones. Cuéntanos quién eres, de dónde eres y en qué estás trabajando. ¡Estamos muy felices de tenerte aquí!",
      pinned: true,
    },
    {
      slug: "demo-build-public-langchain-agents",
      categoryId: cat("proyectos", "general", "automatizaciones"),
      authorId: carlos.id,
      title: "Build in public: Construyendo un agente con LangChain",
      body: "Semana 1 de mi proyecto de build in public. Estoy construyendo un agente de investigación que puede navegar la web, resumir artículos y generar reportes. Stack: LangChain + TypeScript + Supabase.\n\n**Lo que hice esta semana:**\n- Setup inicial del proyecto\n- Primera versión del agente con tool calling\n- Integración con Tavily para búsqueda web\n\n¿Alguien más está construyendo con LangChain? Me gustaría intercambiar ideas.",
      locked: true,
    },
    {
      slug: "demo-recursos-aprender-ml-espanol",
      categoryId: cat("recursos", "general", "modelos"),
      authorId: sofia.id,
      title: "Los mejores recursos para aprender ML en español",
      body: "Compilé una lista de los mejores recursos gratuitos para aprender Machine Learning en español. Incluye cursos, libros, blogs y canales de YouTube.\n\n**Cursos:**\n- Fast.ai (tiene subtítulos en español)\n- Coursera Machine Learning Specialization\n\n**Libros:**\n- Hands-On ML con Scikit-Learn (traducido)\n\n¿Qué otros recursos recomiendan?",
      pinned: true,
    },
    {
      slug: "demo-pregunta-fine-tuning-vs-rag",
      categoryId: cat("preguntas", "modelos", "general"),
      authorId: maria.id,
      title: "¿Cuándo usar Fine-tuning vs RAG?",
      body: "Tengo un caso de uso en fintech donde necesito que el modelo conozca terminología específica de mi empresa. He leído sobre fine-tuning y RAG pero no tengo claro cuándo usar cada uno.\n\n¿Alguien puede explicar las diferencias principales y en qué escenarios conviene cada enfoque?",
    },
    {
      slug: "demo-herramientas-productividad-ia",
      categoryId: cat("general", "automatizaciones", "off-topic"),
      authorId: diego.id,
      title: "Herramientas de IA que uso todos los días como indie hacker",
      body: "Aquí mi stack personal de IA que uso para automatizar mi negocio:\n\n1. **Claude** para escribir y analizar código\n2. **Perplexity** para research rápido\n3. **Make.com** para automatizaciones\n4. **Notion AI** para documentación\n5. **Midjourney** para assets visuales\n\n¿Cuál es tu herramienta de IA favorita que más ha impactado tu productividad?",
    },
    {
      slug: "demo-ux-ia-disenando-interfaces",
      categoryId: cat("general", "proyectos", "off-topic"),
      authorId: valentina.id,
      title: "Diseñando interfaces para productos de IA: mis aprendizajes",
      body: "Llevo 6 meses diseñando interfaces para productos que usan IA y he aprendido algunas cosas importantes:\n\n- **La transparencia importa**: los usuarios necesitan saber cuándo están hablando con IA\n- **Errores de IA ≠ errores de software**: hay que diseñar para la incertidumbre\n- **El contexto es todo**: las respuestas de IA necesitan contexto para ser útiles\n\n¿Qué principios de UX aplican en sus productos de IA?",
    },
    {
      slug: "demo-prompt-engineering-tips",
      categoryId: cat("recursos", "prompts", "general"),
      authorId: camila.id,
      title: "Tips de prompt engineering que nadie te cuenta",
      body: "Después de años escribiendo prompts para diferentes casos de uso, aquí van los tips que más impacto han tenido:\n\n1. **Sé específico con el formato de salida** — pide JSON, markdown, listas\n2. **Da contexto de rol** — 'Eres un experto en...'\n3. **Usa ejemplos** — few-shot siempre mejora los resultados\n4. **Divide y conquista** — un prompt para cada subtarea\n\n¿Cuál es tu técnica de prompting favorita?",
    },
    {
      slug: "demo-meetup-cdmx-anuncio",
      categoryId: cat("anuncios", "eventos-foro", "general"),
      authorId: lucia.id,
      title: "📍 Meetup CDMX — 7 de mayo | Inscríbete aquí",
      body: "¡Hola comunidad! Este mes tenemos nuestro primer meetup presencial en Ciudad de México 🎉\n\n**Fecha:** Miércoles 7 de mayo, 18:00 - 22:00\n**Lugar:** WeWork Reforma 26\n**Capacidad:** 80 personas\n\n**Agenda:**\n- 18:00 Networking y registro\n- 19:00 Lightning talks (5 min c/u)\n- 20:30 Panel: 'Construyendo con IA en LATAM'\n- 22:00 Cierre\n\nRegístrate en /eventos antes de que se agoten los lugares. ¡Los esperamos!",
      pinned: false,
    },
  ];

  for (const thread of threads) {
    const id = deterministicId(`demo:thread:${thread.slug}`);
    await db.execute(sql`
      INSERT INTO forum_threads (id, category_id, author_id, title, slug, body, pinned, locked, created_at, last_activity_at)
      VALUES (
        ${id},
        ${thread.categoryId},
        ${thread.authorId},
        ${thread.title},
        ${thread.slug},
        ${thread.body},
        ${thread.pinned ?? false},
        ${thread.locked ?? false},
        NOW() - INTERVAL '3 days',
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `);

    if (thread.locked) {
      await db.execute(sql`
        UPDATE forum_threads SET locked = true WHERE id = ${id}
      `);
    }

    console.log(`  ✔  Thread: ${thread.title}`);
  }

  const threadIdMap = Object.fromEntries(
    threads.map((t) => [t.slug, deterministicId(`demo:thread:${t.slug}`)])
  );

  const replies = [
    {
      id: deterministicId("demo:post:bienvenidos:sofia"),
      threadId: threadIdMap["demo-bienvenidos-comunidad"]!,
      authorId: sofia.id,
      body: "¡Hola! Soy Sofía, investigadora de ML en Buenos Aires. Estoy trabajando en técnicas de few-shot learning para idiomas con pocos recursos. Muy feliz de encontrar esta comunidad en español 🎉",
    },
    {
      id: deterministicId("demo:post:bienvenidos:carlos"),
      threadId: threadIdMap["demo-bienvenidos-comunidad"]!,
      authorId: carlos.id,
      body: "¡Buenas! Carlos desde Bogotá. Indie hacker construyendo herramientas de automatización con IA. ¡Emocionado de hacer networking y aprender de todos!",
    },
    {
      id: deterministicId("demo:post:bienvenidos:maria"),
      threadId: threadIdMap["demo-bienvenidos-comunidad"]!,
      authorId: maria.id,
      body: "¡Hola comunidad! Soy María, data scientist en Lima. Me especializo en modelos de riesgo crediticio y últimamente explorando cómo LLMs pueden mejorar el análisis financiero.",
    },
    {
      id: deterministicId("demo:post:ml-recursos:andres"),
      threadId: threadIdMap["demo-recursos-aprender-ml-espanol"]!,
      authorId: andres.id,
      body: "¡Excelente compilado Sofía! Yo agregaría el canal de YouTube de Dot CSV, que tiene contenido muy bueno en español sobre ML y IA. ¿Conoces algún recurso específico para aprender a usar la API de OpenAI?",
    },
    {
      id: deterministicId("demo:post:ml-recursos:sofia-reply"),
      threadId: threadIdMap["demo-recursos-aprender-ml-espanol"]!,
      authorId: sofia.id,
      body: "¡Buena sugerencia Andrés! Sí, para la API de OpenAI recomendaría empezar con la documentación oficial y el cookbook que tienen en GitHub. También hay un curso gratuito de DeepLearning.AI con Andrew Ng.",
      parentPostId: deterministicId("demo:post:ml-recursos:andres"),
    },
    {
      id: deterministicId("demo:post:fine-tuning:lucia"),
      threadId: threadIdMap["demo-pregunta-fine-tuning-vs-rag"]!,
      authorId: lucia.id,
      body: "Buena pregunta María. En términos generales:\n\n**RAG** es mejor cuando:\n- Tu información cambia frecuentemente\n- Necesitas citar fuentes\n- Tienes presupuesto limitado\n\n**Fine-tuning** es mejor cuando:\n- Necesitas un estilo muy específico de respuesta\n- La información es estática y bien definida\n- Latencia es crítica\n\nPara tu caso en fintech con terminología específica, yo empezaría con RAG porque es más fácil de actualizar y mantener.",
    },
    {
      id: deterministicId("demo:post:fine-tuning:carlos"),
      threadId: threadIdMap["demo-pregunta-fine-tuning-vs-rag"]!,
      authorId: carlos.id,
      body: "Coincido con Lucía. En mi experiencia, el 80% de los casos RAG es suficiente y mucho más barato. Fine-tuning tiene sentido cuando ya tienes RAG funcionando y quieres ese 20% extra de mejora.",
    },
    {
      id: deterministicId("demo:post:herramientas:valentina"),
      threadId: threadIdMap["demo-herramientas-productividad-ia"]!,
      authorId: valentina.id,
      body: "¡Gran lista Diego! Para mí la que más ha cambiado mi flujo de trabajo es v0.dev de Vercel para prototipar interfaces rápidamente. Genero un wireframe en Figma y luego v0 me da el código en React. Ahorra horas de trabajo.",
    },
  ];

  for (const post of replies) {
    await db.execute(sql`
      INSERT INTO forum_posts (id, thread_id, author_id, body, parent_post_id, created_at)
      VALUES (
        ${post.id}, ${post.threadId}, ${post.authorId}, ${post.body},
        ${(post as { parentPostId?: string }).parentPostId ?? null}, NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `);
  }

  const reactions = [
    { postId: replies[0]!.id, userId: lucia.id,     emoji: "👋" },
    { postId: replies[0]!.id, userId: carlos.id,    emoji: "🎉" },
    { postId: replies[1]!.id, userId: sofia.id,     emoji: "🔥" },
    { postId: replies[3]!.id, userId: maria.id,     emoji: "👍" },
    { postId: replies[5]!.id, userId: maria.id,     emoji: "🙌" },
    { postId: replies[5]!.id, userId: andres.id,    emoji: "💡" },
    { postId: replies[6]!.id, userId: lucia.id,     emoji: "👍" },
    { postId: replies[7]!.id, userId: diego.id,     emoji: "🔥" },
  ];

  for (const reaction of reactions) {
    const id = deterministicId(`demo:reaction:${reaction.postId}:${reaction.userId}:${reaction.emoji}`);
    await db.execute(sql`
      INSERT INTO forum_reactions (id, post_id, user_id, emoji, created_at)
      VALUES (${id}, ${reaction.postId}, ${reaction.userId}, ${reaction.emoji}, NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }

  return threads.length;
}

// ─── Seed marketplace ─────────────────────────────────────────────────────────

async function seedMarketplace(users: SeededUser[]) {
  const carlos    = users.find((u) => u.email.startsWith("carlos"))!;
  const sofia     = users.find((u) => u.email.startsWith("sofia"))!;
  const valentina = users.find((u) => u.email.startsWith("valentina"))!;
  const diego     = users.find((u) => u.email.startsWith("diego"))!;
  const camila    = users.find((u) => u.email.startsWith("camila"))!;
  const andres    = users.find((u) => u.email.startsWith("andres"))!;
  const maria     = users.find((u) => u.email.startsWith("maria"))!;

  const listings = [
    {
      slug: "demo-agente-investigacion-langchain",
      sellerId: carlos.id,
      title: "Agente de Investigación con LangChain",
      description: "Agente autónomo que navega la web, extrae información y genera reportes en PDF. Código fuente completo con documentación en español.",
      price: "299",
      currency: "USD",
      category: "Software",
    },
    {
      slug: "demo-consultoria-ml-implementacion",
      sellerId: sofia.id,
      title: "Consultoría en Implementación de ML",
      description: "Sesiones 1:1 de consultoría para equipos que quieren implementar ML en sus productos. 3 sesiones de 90 minutos con seguimiento.",
      price: "500",
      currency: "USD",
      category: "Servicios",
    },
    {
      slug: "demo-kit-diseno-ui-ia",
      sellerId: valentina.id,
      title: "Kit de Diseño UI para Productos de IA",
      description: "Componentes de Figma diseñados específicamente para apps de IA: chat interfaces, loading states, error handling y más. 200+ componentes.",
      price: "89",
      currency: "USD",
      category: "Diseño",
    },
    {
      slug: "demo-automatizacion-make-openai",
      sellerId: diego.id,
      title: "Pack de Automatizaciones Make + OpenAI",
      description: "15 blueprints de Make.com listos para usar que integran OpenAI GPT-4. Automatiza tu negocio en minutos sin código.",
      price: "149",
      currency: "USD",
      category: "Automatización",
    },
    {
      slug: "demo-curso-copywriting-ia",
      sellerId: camila.id,
      title: "Curso: Copywriting con IA para Negocios",
      description: "Aprende a usar IA para crear contenido que convierte. Incluye 12 módulos, prompts probados y acceso a comunidad privada.",
      price: "197",
      currency: "USD",
      category: "Educación",
    },
    {
      slug: "demo-boilerplate-api-openai",
      sellerId: andres.id,
      title: "Boilerplate: API REST con OpenAI",
      description: "Starter kit production-ready para APIs que usan OpenAI. Incluye rate limiting, caching, streaming y dashboard de métricas.",
      price: "79",
      currency: "USD",
      category: "Software",
    },
  ];

  for (const listing of listings) {
    const id = deterministicId(`demo:listing:${listing.slug}`);
    await db.execute(sql`
      INSERT INTO marketplace_listings (id, seller_id, title, slug, description, price, currency, category, status, created_at, updated_at)
      VALUES (
        ${id}, ${listing.sellerId}, ${listing.title}, ${listing.slug},
        ${listing.description}, ${listing.price}, ${listing.currency},
        ${listing.category}, 'active', NOW(), NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        title       = EXCLUDED.title,
        description = EXCLUDED.description,
        status      = 'active',
        updated_at  = NOW()
    `);

    for (let i = 0; i < 2; i++) {
      const imgId = deterministicId(`demo:listing-image:${listing.slug}:${i}`);
      const imgUrl = `https://picsum.photos/seed/${listing.slug}-${i}/800/600`;
      await db.execute(sql`
        INSERT INTO listing_images (id, listing_id, url, order_index)
        VALUES (${imgId}, ${id}, ${imgUrl}, ${i})
        ON CONFLICT (id) DO NOTHING
      `);
    }

    console.log(`  ✔  Listing: ${listing.title}`);
  }

  const listingIds = listings.map((l) => deterministicId(`demo:listing:${l.slug}`));

  const conversations = [
    { id: "cm:0:a", listingId: listingIds[0]!, fromId: maria.id,     toId: carlos.id,    body: "Hola Carlos! Me interesa mucho el agente de investigación. ¿Funciona bien con documentos en español?" },
    { id: "cm:0:b", listingId: listingIds[0]!, fromId: carlos.id,    toId: maria.id,     body: "¡Hola María! Sí, está diseñado específicamente para LATAM. Soporta PDFs, Word y páginas web en español sin ningún problema." },
    { id: "cm:0:c", listingId: listingIds[0]!, fromId: maria.id,     toId: carlos.id,    body: "Perfecto, ¿incluye soporte post-compra por si tengo preguntas técnicas?" },
    { id: "cm:1:a", listingId: listingIds[1]!, fromId: andres.id,    toId: sofia.id,     body: "Sofía, ¿las sesiones de consultoría pueden ser para equipos de 3 personas?" },
    { id: "cm:1:b", listingId: listingIds[1]!, fromId: sofia.id,     toId: andres.id,    body: "¡Claro que sí! El paquete incluye hasta 5 participantes por sesión. Podemos adaptar la agenda a las necesidades específicas de tu equipo." },
    { id: "cm:1:c", listingId: listingIds[1]!, fromId: andres.id,    toId: sofia.id,     body: "Genial, nos interesa enfocarnos en integración de LLMs con APIs legacy. ¿Tienes experiencia con ese caso?" },
    { id: "cm:2:a", listingId: listingIds[2]!, fromId: diego.id,     toId: valentina.id, body: "¡El kit se ve increíble! ¿Hay componentes para flujos de onboarding de IA?" },
    { id: "cm:2:b", listingId: listingIds[2]!, fromId: valentina.id, toId: diego.id,     body: "¡Sí! Tengo una sección completa de onboarding: progress steps, tooltips contextuales, primeras interacciones con el chat y pantallas de estado vacío." },
    { id: "cm:2:c", listingId: listingIds[2]!, fromId: diego.id,     toId: valentina.id, body: "Perfecto, eso es exactamente lo que necesito. ¿Están en auto-layout y con variables de color?" },
  ];

  for (const conv of conversations) {
    const msgId = deterministicId(`demo:listing-message:${conv.id}`);
    await db.execute(sql`
      INSERT INTO listing_messages (id, listing_id, from_id, to_id, body, created_at)
      VALUES (${msgId}, ${conv.listingId}, ${conv.fromId}, ${conv.toId}, ${conv.body}, NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }

  return listings.length;
}

// ─── Seed notifications ───────────────────────────────────────────────────────

async function seedNotifications(users: SeededUser[]) {
  const lucia   = users.find((u) => u.email.startsWith("lucia"))!;
  const carlos  = users.find((u) => u.email.startsWith("carlos"))!;
  const maria   = users.find((u) => u.email.startsWith("maria"))!;
  const andres  = users.find((u) => u.email.startsWith("andres"))!;
  const sofia   = users.find((u) => u.email.startsWith("sofia"))!;

  const day = 86_400_000;
  const now = Date.now();

  const notifs = [
    { seed: "n01", userId: carlos.id,  type: "forum_reply",        title: "Nueva respuesta en tu hilo",     body: "Lucía Méndez respondió en 'Build in public: Construyendo un agente con LangChain'",    link: "/foro/demo-build-public-langchain-agents",          isRead: false, ago: 0.5 * day },
    { seed: "n02", userId: carlos.id,  type: "event_rsvp",         title: "Confirmación de asistencia",     body: "Te has registrado para 'Workshop: Agentes con LangChain'",                           link: "/eventos/demo:workshop-langchain-2026-02",           isRead: true,  ago: 2 * day },
    { seed: "n03", userId: maria.id,   type: "forum_reply",        title: "Nueva respuesta en tu hilo",     body: "Carlos Reyes respondió en '¿Cuándo usar Fine-tuning vs RAG?'",                      link: "/foro/demo-pregunta-fine-tuning-vs-rag",            isRead: false, ago: 1 * day },
    { seed: "n04", userId: maria.id,   type: "marketplace_message", title: "Nuevo mensaje en tu consulta",  body: "Carlos Reyes respondió sobre 'Agente de Investigación con LangChain'",               link: "/marketplace/demo-agente-investigacion-langchain",  isRead: false, ago: 0.25 * day },
    { seed: "n05", userId: maria.id,   type: "event_rsvp",         title: "Recordatorio de evento",         body: "El evento 'AI LATAM Conference 2026' es en 3 días",                                 link: "/eventos/demo:conference-ai-latam-2026-04",         isRead: true,  ago: 3 * day },
    { seed: "n06", userId: andres.id,  type: "forum_reply",        title: "Nueva respuesta en tu hilo",     body: "Sofía Torres respondió en 'Los mejores recursos para aprender ML en español'",       link: "/foro/demo-recursos-aprender-ml-espanol",           isRead: false, ago: 4 * day },
    { seed: "n07", userId: andres.id,  type: "resource_status",    title: "Recurso publicado",              body: "Tu recurso 'Plantilla MVP para Apps de IA' fue publicado",                          link: "/recursos/demo-plantilla-mvp-ia",                  isRead: true,  ago: 5 * day },
    { seed: "n08", userId: sofia.id,   type: "admin_action",       title: "Acción de administrador",        body: "Tu hilo 'Los mejores recursos para aprender ML en español' fue marcado como destacado", link: "/foro/demo-recursos-aprender-ml-espanol",        isRead: false, ago: 1.5 * day },
    { seed: "n09", userId: sofia.id,   type: "marketplace_message", title: "Nueva consulta de marketplace", body: "Andrés López te envió un mensaje sobre 'Consultoría en Implementación de ML'",      link: "/marketplace/demo-consultoria-ml-implementacion",  isRead: false, ago: 6 * day },
    { seed: "n10", userId: lucia.id,   type: "forum_reply",        title: "Nueva respuesta en un hilo",     body: "Carlos Reyes respondió en '¡Bienvenidos a AI Comunidad! Preséntate aquí'",           link: "/foro/demo-bienvenidos-comunidad",                 isRead: true,  ago: 7 * day },
    { seed: "n11", userId: lucia.id,   type: "admin_action",       title: "Reporte de contenido",           body: "Nuevo reporte de contenido pendiente de revisión",                                  link: "/admin/moderation",                               isRead: false, ago: 2.5 * day },
    { seed: "n12", userId: carlos.id,  type: "listing_status",     title: "Listing activo",                 body: "Tu listing 'Agente de Investigación con LangChain' está activo y visible",          link: "/marketplace/demo-agente-investigacion-langchain",  isRead: true,  ago: 6.5 * day },
  ];

  for (const n of notifs) {
    const id = deterministicId(`demo:notification:${n.seed}`);
    const createdAt = new Date(now - n.ago);
    await db.execute(sql`
      INSERT INTO notifications (id, user_id, type, title, body, link, is_read, created_at)
      VALUES (${id}, ${n.userId}, ${n.type}, ${n.title}, ${n.body}, ${n.link ?? null}, ${n.isRead}, ${createdAt.toISOString()})
      ON CONFLICT (id) DO NOTHING
    `);
  }

  return notifs.length;
}

// ─── Clean mode ───────────────────────────────────────────────────────────────

async function clean() {
  return cleanWithDeps({ clerk, db, pool });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (isClean) return clean();

  console.log("\n🌱  Starting demo seed…\n");

  const users: SeededUser[] = [];
  console.log("👤  Creating/updating users…");
  for (const persona of PERSONAS) {
    const u = await idempotentCreateUser(persona);
    users.push(u);
  }

  console.log("\n📅  Seeding events…");
  const eventCount = await seedEvents(users);

  console.log("\n📚  Seeding resources…");
  const resourceCount = await seedResources(users);

  console.log("\n💬  Seeding forum threads & posts…");
  const threadCount = await seedForum(users);

  console.log("\n🛒  Seeding marketplace listings…");
  const listingCount = await seedMarketplace(users);

  console.log("\n🔔  Seeding notifications…");
  const notifCount = await seedNotifications(users);

  const credentialsPath = "/tmp/seed-demo-credentials.md";
  const rows = users.map(
    (u) =>
      `| ${u.email} | ${DEMO_PASSWORD} | ${u.role} | ${u.id} | https://i.pravatar.cc/300?u=${encodeURIComponent(u.email)} |`
  );
  const md = [
    "# Demo Seed Credentials",
    "",
    "| Email | Password | Role | Clerk ID | Avatar |",
    "|-------|----------|------|----------|--------|",
    ...rows,
    "",
    `Generated: ${new Date().toISOString()}`,
  ].join("\n");

  fs.writeFileSync(credentialsPath, md, "utf8");

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ✅  Demo seed complete!                                      ║
╠══════════════════════════════════════════════════════════════╣
║  Created/updated: ${String(users.length).padEnd(2)} users                             ║
║  Events:          ${String(eventCount).padEnd(2)}                                     ║
║  Resources:       ${String(resourceCount).padEnd(2)}                                  ║
║  Forum threads:   ${String(threadCount).padEnd(2)}                                    ║
║  Listings:        ${String(listingCount).padEnd(2)}                                   ║
║  Notifications:   ${String(notifCount).padEnd(2)}                                    ║
╠══════════════════════════════════════════════════════════════╣
║  📄  Credentials: /tmp/seed-demo-credentials.md              ║
╚══════════════════════════════════════════════════════════════╝
`);

  await pool.end();
}

main().catch((err) => {
  console.error("❌  Seed failed:", err.message ?? err);
  if (err.errors) console.error("   Clerk errors:", JSON.stringify(err.errors, null, 2));
  if (err.cause) console.error("   Cause:", err.cause);
  console.error(err.stack);
  process.exit(1);
});
