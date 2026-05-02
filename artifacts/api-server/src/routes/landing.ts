import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, landingSectionsTable } from "@workspace/db";
import { requireAdmin } from "../lib/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

async function ensureDefaultSections() {
  const defaults = [
    { section: "hero", content: { headline: "Connect, collaborate, and grow with AI practitioners", subtitle: "Join a thriving community of builders, researchers, and enthusiasts pushing the boundaries of artificial intelligence.", cta: "Join the Community" } },
    { section: "features", content: { items: ["Member directory", "Events & RSVPs", "Forum discussions", "Resource library", "Marketplace"] } },
  ];
  for (const d of defaults) {
    const existing = await db.query.landingSectionsTable.findFirst({ where: eq(landingSectionsTable.section, d.section) });
    if (!existing) {
      await db.insert(landingSectionsTable).values({ id: randomUUID(), section: d.section, content: d.content });
    }
  }
}

// GET /landing/content
router.get("/landing/content", async (_req, res) => {
  await ensureDefaultSections();
  const sections = await db.query.landingSectionsTable.findMany();
  res.json(sections);
});

// PUT /landing/content/:section
router.put("/landing/content/:section", requireAdmin, async (req, res) => {
  const sectionKey = req.params.section as string;
  const { content } = req.body;
  const existing = await db.query.landingSectionsTable.findFirst({ where: eq(landingSectionsTable.section, sectionKey) });
  let section;
  if (existing) {
    [section] = await db.update(landingSectionsTable).set({ content, updatedAt: new Date() })
      .where(eq(landingSectionsTable.section, sectionKey)).returning();
  } else {
    [section] = await db.insert(landingSectionsTable).values({ id: randomUUID(), section: sectionKey, content }).returning();
  }
  res.json(section);
});

export default router;
