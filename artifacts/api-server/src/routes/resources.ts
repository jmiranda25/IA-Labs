import { Router } from "express";
import { eq, ilike, sql, and, or } from "drizzle-orm";
import { db, resourcesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

async function enrichResource(r: typeof resourcesTable.$inferSelect) {
  const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, r.authorId) });
  return { ...r, authorName: author?.displayName ?? "Unknown", authorAvatar: author?.avatarUrl ?? null };
}

// GET /resources
router.get("/resources", requireAuth, async (req, res) => {
  const { search, category, limit = "20", offset = "0" } = req.query as Record<string, string>;
  const conditions = [];
  if (search) conditions.push(or(ilike(resourcesTable.title, `%${search}%`), ilike(resourcesTable.description, `%${search}%`)));
  if (category) conditions.push(eq(resourcesTable.category, category));
  const where = conditions.length ? and(...conditions) : undefined;
  const resources = await db.query.resourcesTable.findMany({ where, limit: parseInt(limit), offset: parseInt(offset), orderBy: resourcesTable.createdAt });
  const total = await db.select({ count: sql<number>`count(*)` }).from(resourcesTable).where(where);
  const enriched = await Promise.all(resources.map(enrichResource));
  res.json({ resources: enriched, total: Number(total[0]?.count ?? 0) });
});

// POST /resources
router.post("/resources", requireAuth, async (req, res) => {
  const { title, description, fileUrl, fileType, fileSize, category, tags } = req.body;
  const [resource] = await db.insert(resourcesTable).values({
    id: randomUUID(), title, description, fileUrl, fileType, fileSize, category, tags: tags ?? [], authorId: req.userId!,
  }).returning();
  res.status(201).json(await enrichResource(resource));
});

// GET /resources/categories
router.get("/resources/categories", requireAuth, async (_req, res) => {
  const rows = await db.selectDistinct({ category: resourcesTable.category }).from(resourcesTable);
  res.json(rows.map((r) => r.category));
});

// GET /resources/:resourceId
router.get("/resources/:resourceId", requireAuth, async (req, res) => {
  const resourceId = req.params.resourceId as string;
  const resource = await db.query.resourcesTable.findFirst({ where: eq(resourcesTable.id, resourceId) });
  if (!resource) { res.status(404).json({ error: "Not found" }); return; }
  await db.update(resourcesTable).set({ downloadCount: sql`download_count + 1` }).where(eq(resourcesTable.id, resource.id));
  res.json(await enrichResource({ ...resource, downloadCount: resource.downloadCount + 1 }));
});

// DELETE /resources/:resourceId
router.delete("/resources/:resourceId", requireAuth, async (req, res) => {
  const resourceId = req.params.resourceId as string;
  await db.delete(resourcesTable).where(eq(resourcesTable.id, resourceId));
  res.status(204).send();
});

export default router;
