import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db, landingSectionsTable, landingFaqsTable } from "@workspace/db";
import { requireAdmin } from "../lib/requireAuth";

const router = Router();

// ── 60-second in-memory cache ─────────────────────────────────────────────────

type CacheEntry = { data: object; expiresAt: number };
let cache: CacheEntry | null = null;

function invalidateCache() {
  cache = null;
}

async function fetchContent() {
  const [sections, faqs] = await Promise.all([
    db.select().from(landingSectionsTable).orderBy(asc(landingSectionsTable.orderIndex)),
    db.select().from(landingFaqsTable).orderBy(asc(landingFaqsTable.orderIndex)),
  ]);
  return { sections, faqs };
}

// ── Seed defaults keyed by section slug ───────────────────────────────────────

const SEED_DEFAULTS: Record<string, { title: string | null; subtitle: string | null; body: string | null; imageUrl: string | null; content: object }> = {
  hero: {
    title: "Construye, aprende y crece con la comunidad de IA más activa.",
    subtitle: "Conéctate con builders, founders y profesionales que están creando con IA todos los días. Eventos, recursos, foro y marketplace en un solo lugar.",
    body: null, imageUrl: null,
    content: {
      badge: "🤝 Comunidad de IA en español",
      cta_primary: "Unirme gratis", cta_secondary: "Ya tengo cuenta",
      stats: [{ value: "+500", label: "miembros activos" }, { value: "+20", label: "workshops realizados" }, { value: "+100", label: "recursos curados" }],
    },
  },
  about: {
    title: null, subtitle: null,
    body: "Somos un espacio para quienes quieren **dejar de mirar la IA desde afuera y empezar a construir con ella**. Compartimos prompts, plantillas, agentes, automatizaciones y aprendizajes reales — sin humo y sin gurús.",
    imageUrl: null, content: {},
  },
  benefits: {
    title: "Todo lo que necesitas para crecer con IA",
    subtitle: "Un ecosistema completo para aprender, conectar y construir.",
    body: null, imageUrl: null,
    content: { items: [
      { icon: "GraduationCap", title: "Workshops y eventos", body: "Sesiones prácticas mensuales para aprender haciendo." },
      { icon: "MessageSquare", title: "Foro activo", body: "Resuelve dudas, comparte avances y aprende en público." },
      { icon: "Bell", title: "Novedades al día", body: "Lo más relevante del ecosistema de IA, filtrado y resumido." },
    ]},
  },
  who_is_for: {
    title: "¿Para quién es?",
    subtitle: "Si estás construyendo con IA o quieres empezar, este es tu lugar.",
    body: null, imageUrl: null,
    content: { profiles: [
      { emoji: "🛠️", label: "Builders de IA", body: "Que crean agentes, automatizaciones o productos." },
      { emoji: "🚀", label: "Founders y emprendedores", body: "Que quieren integrar IA en su negocio." },
      { emoji: "🎯", label: "Profesionales en transición", body: "Que buscan re-skillearse con IA." },
    ]},
  },
  how_it_works: {
    title: "Cómo funciona",
    subtitle: "Cuatro pasos para pasar de nuevo miembro a parte activa de la comunidad.",
    body: null, imageUrl: null,
    content: { steps: [
      { n: "01", title: "Regístrate gratis", body: "Con tu email, en menos de un minuto." },
      { n: "02", title: "Completa tu perfil", body: "Con tus intereses en IA para conectar con quien te complementa." },
      { n: "03", title: "Participa", body: "Foro, eventos, marketplace, recursos — todo en un solo lugar." },
      { n: "04", title: "Crece", body: "Aprende, conecta y construye con la comunidad." },
    ]},
  },
  testimonials: {
    title: "Lo que dicen nuestros miembros",
    subtitle: "Personas reales, resultados concretos.",
    body: null, imageUrl: null,
    content: { items: [
      { quote: "Aquí encontré la comunidad que no sabía que necesitaba para empezar a construir agentes en serio.", name: "Nombre Apellido", role: "Founder en [Empresa]", initials: "NA" },
      { quote: "Los workshops valen oro. Aprendí más en un mes que en seis meses solo.", name: "Nombre Apellido", role: "AI Engineer", initials: "NA" },
      { quote: "El marketplace me trajo mis primeros tres clientes consultando con IA.", name: "Nombre Apellido", role: "Consultor independiente", initials: "NA" },
    ]},
  },
  cta_final: {
    title: "Tu próximo proyecto con IA empieza aquí.",
    subtitle: "Únete gratis y empieza a construir con la comunidad hoy mismo.",
    body: null, imageUrl: null,
    content: { cta_text: "Crear mi cuenta", fine_print: "Sin tarjeta de crédito · Gratis para siempre en el núcleo" },
  },
};

// ── Public: GET /landing/content ─────────────────────────────────────────────

router.get("/landing/content", async (req, res) => {
  try {
    const preview = req.query.preview === "1";
    const now = Date.now();

    if (!preview && cache && cache.expiresAt > now) {
      res.json(cache.data);
      return;
    }

    const data = await fetchContent();

    if (!preview) {
      cache = { data, expiresAt: now + 60_000 };
    }

    res.json(data);
  } catch (err) {
    console.error("GET /landing/content error:", (err as Error)?.message ?? err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ── Admin: reorder sections (must come before /:id to avoid route conflict) ───

router.patch("/admin/landing/sections/reorder", requireAdmin, async (req, res) => {
  const rawIds: unknown = req.body?.ids;
  const ids: string[] = Array.isArray(rawIds) ? (rawIds as string[]) : [];
  if (ids.length === 0) { res.status(400).json({ error: "ids required" }); return; }
  await Promise.all(ids.map((id: string, idx: number) => db.update(landingSectionsTable).set({ orderIndex: idx, updatedAt: new Date() }).where(eq(landingSectionsTable.id, id))));
  invalidateCache();
  res.json({ ok: true });
});

// ── Admin: PATCH /admin/landing/sections/:id ──────────────────────────────────

router.patch("/admin/landing/sections/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  const { title, subtitle, body, imageUrl, enabled, content } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (subtitle !== undefined) updates.subtitle = subtitle;
  if (body !== undefined) updates.body = body;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (enabled !== undefined) updates.enabled = enabled;
  if (content !== undefined) updates.content = content;

  const [updated] = await db.update(landingSectionsTable).set(updates).where(eq(landingSectionsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "not found" }); return; }
  invalidateCache();
  res.json(updated);
});

// ── Admin: POST /admin/landing/sections/:id/reset ─────────────────────────────

router.post("/admin/landing/sections/:id/reset", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  const existing = await db.query.landingSectionsTable.findFirst({ where: eq(landingSectionsTable.id, id) });
  if (!existing) { res.status(404).json({ error: "not found" }); return; }
  const seed = SEED_DEFAULTS[existing.section];
  if (!seed) { res.status(400).json({ error: "no seed for this section" }); return; }
  const [updated] = await db.update(landingSectionsTable).set({ ...seed, updatedAt: new Date() }).where(eq(landingSectionsTable.id, id)).returning();
  invalidateCache();
  res.json(updated);
});

// ── Admin: reorder FAQs ───────────────────────────────────────────────────────

router.patch("/admin/landing/faqs/reorder", requireAdmin, async (req, res) => {
  const rawIds: unknown = req.body?.ids;
  const ids: string[] = Array.isArray(rawIds) ? (rawIds as string[]) : [];
  if (ids.length === 0) { res.status(400).json({ error: "ids required" }); return; }
  await Promise.all(ids.map((id: string, idx: number) => db.update(landingFaqsTable).set({ orderIndex: idx, updatedAt: new Date() }).where(eq(landingFaqsTable.id, id))));
  invalidateCache();
  res.json({ ok: true });
});

// ── Admin: PATCH /admin/landing/faqs/:id ─────────────────────────────────────

router.patch("/admin/landing/faqs/:id", requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  const { question, answer, enabled } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (question !== undefined) updates.question = question;
  if (answer !== undefined) updates.answer = answer;
  if (enabled !== undefined) updates.enabled = enabled;

  const [updated] = await db.update(landingFaqsTable).set(updates).where(eq(landingFaqsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "not found" }); return; }
  invalidateCache();
  res.json(updated);
});

export default router;
