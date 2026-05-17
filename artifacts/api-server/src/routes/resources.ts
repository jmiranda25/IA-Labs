import { Router } from "express";
import { eq, ilike, and, or, lt, desc, inArray, sql } from "drizzle-orm";
import {
  db,
  resourcesTable,
  resourceTagsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { setObjectAclPolicy } from "../lib/objectAcl";
import { notify } from "../lib/notify";
import { randomUUID } from "crypto";
import multer from "multer";

const router = Router();
const objectStorageService = new ObjectStorageService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let i = 2;
  while (true) {
    const existing = await db.query.resourcesTable.findFirst({
      where: eq(resourcesTable.slug, slug),
    });
    if (!existing || existing.id === excludeId) break;
    slug = `${base}-${i++}`;
  }
  return slug;
}

async function getTagsForResource(resourceId: string): Promise<string[]> {
  const rows = await db
    .select({ tag: resourceTagsTable.tag })
    .from(resourceTagsTable)
    .where(eq(resourceTagsTable.resourceId, resourceId));
  return rows.map((r) => r.tag);
}

async function enrichResource(r: typeof resourcesTable.$inferSelect) {
  const [author, tags] = await Promise.all([
    db.query.usersTable.findFirst({ where: eq(usersTable.id, r.authorId) }),
    getTagsForResource(r.id),
  ]);
  return {
    ...r,
    tags,
    authorName: author?.displayName ?? "Unknown",
    authorAvatar: author?.avatarUrl ?? null,
  };
}

async function setTagsForResource(
  resourceId: string,
  tags: string[],
): Promise<void> {
  await db
    .delete(resourceTagsTable)
    .where(eq(resourceTagsTable.resourceId, resourceId));
  const unique = [...new Set(tags.map((t) => t.trim().toLowerCase()))].filter(
    Boolean,
  );
  if (unique.length === 0) return;
  await db.insert(resourceTagsTable).values(
    unique.map((tag) => ({ id: randomUUID(), resourceId, tag })),
  );
}

// Converts stored filePath "/api/storage/objects/..." to objectStorage path "/objects/..."
function filePathToObjectPath(filePath: string): string {
  return filePath.replace("/api/storage", "");
}

// ── GET /resources ────────────────────────────────────────────────────────────

router.get("/resources", requireAuth, async (req, res) => {
  const { q, tags, type, cursor } = req.query as Record<string, string>;
  const userId = req.userDbId!;
  const PAGE = 20;

  const conditions: Parameters<typeof and>[0][] = [];

  conditions.push(
    or(eq(resourcesTable.published, true), eq(resourcesTable.authorId, userId)),
  );

  if (q) conditions.push(ilike(resourcesTable.title, `%${q}%`));

  if (type && ["link", "file", "course"].includes(type)) {
    conditions.push(eq(resourcesTable.type, type as "link" | "file" | "course"));
  }

  if (cursor) {
    try {
      const { createdAt, id } = JSON.parse(
        Buffer.from(cursor, "base64").toString(),
      );
      conditions.push(
        or(
          lt(resourcesTable.createdAt, new Date(createdAt)),
          and(
            eq(resourcesTable.createdAt, new Date(createdAt)),
            lt(resourcesTable.id, id),
          ),
        ),
      );
    } catch {
      /* ignore bad cursor */
    }
  }

  let tagList: string[] = [];
  if (tags) {
    tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
  }

  if (tagList.length > 0) {
    const tagMatches = await db
      .select({ resourceId: resourceTagsTable.resourceId })
      .from(resourceTagsTable)
      .where(inArray(resourceTagsTable.tag, tagList))
      .groupBy(resourceTagsTable.resourceId)
      .having(sql`count(distinct ${resourceTagsTable.tag}) = ${tagList.length}`);

    const ids = tagMatches.map((r) => r.resourceId);
    if (ids.length === 0) {
      res.json({ resources: [], nextCursor: null });
      return;
    }
    conditions.push(inArray(resourcesTable.id, ids));
  }

  const rows = await db
    .select()
    .from(resourcesTable)
    .where(and(...conditions))
    .orderBy(desc(resourcesTable.createdAt), desc(resourcesTable.id))
    .limit(PAGE + 1);

  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE);
  const enriched = await Promise.all(page.map(enrichResource));

  let nextCursor: string | null = null;
  if (hasMore) {
    const last = page[page.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({ createdAt: last.createdAt, id: last.id }),
    ).toString("base64");
  }

  res.json({ resources: enriched, nextCursor });
});

// ── GET /resources/:slug ──────────────────────────────────────────────────────

router.get("/resources/:slug", requireAuth, async (req, res) => {
  const slug = req.params.slug as string;
  const userId = req.userDbId!;

  const resource = await db.query.resourcesTable.findFirst({
    where: eq(resourcesTable.slug, slug),
  });
  if (!resource) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!resource.published && resource.authorId !== userId && !req.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(await enrichResource(resource));
});

// ── POST /resources ───────────────────────────────────────────────────────────

router.post("/resources", requireAuth, async (req, res) => {
  const {
    title,
    type,
    url,
    description,
    coverUrl,
    tags,
  } = req.body as {
    title: string;
    type: "link" | "file" | "course";
    url?: string;
    description?: string;
    coverUrl?: string;
    tags?: string[];
  };

  if (!title || !type) {
    res.status(400).json({ error: "title and type are required" });
    return;
  }

  const id = randomUUID();
  const slug = await uniqueSlug(title);

  const [resource] = await db
    .insert(resourcesTable)
    .values({
      id,
      title,
      slug,
      type,
      url: url ?? null,
      description: description ?? "",
      coverUrl: coverUrl ?? null,
      authorId: req.userDbId!,
      published: false,
    })
    .returning();

  if (tags && tags.length > 0) {
    await setTagsForResource(id, tags);
  }

  res.status(201).json(await enrichResource(resource));
});

// ── POST /resources/:slug/file ────────────────────────────────────────────────

router.post(
  "/resources/:slug/file",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    const slug = req.params.slug as string;
    const userId = req.userDbId!;

    const resource = await db.query.resourcesTable.findFirst({
      where: eq(resourcesTable.slug, slug),
    });
    if (!resource) { res.status(404).json({ error: "Not found" }); return; }
    if (resource.authorId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (resource.type !== "file") {
      res.status(400).json({ error: "Only file-type resources can have a file" });
      return;
    }
    if (!req.file) { res.status(400).json({ error: "No file provided" }); return; }

    // delete old file if present
    if (resource.filePath) {
      try {
        const objPath = filePathToObjectPath(resource.filePath);
        const oldFile = await objectStorageService.getObjectEntityFile(objPath);
        await oldFile.delete();
      } catch { /* ignore */ }
    }

    const ext = req.file.originalname.split(".").pop() ?? "bin";
    const subPath = `resources/${slug}/${randomUUID()}.${ext}`;

    await objectStorageService.uploadToPrivate(
      subPath,
      req.file.buffer,
      req.file.mimetype,
      { owner: userId, visibility: "private" },
    );

    const filePath = `/api/storage/objects/${subPath}`;
    const [updated] = await db
      .update(resourcesTable)
      .set({ filePath })
      .where(eq(resourcesTable.id, resource.id))
      .returning();

    res.json(await enrichResource(updated));
  },
);

// ── DELETE /resources/:slug ───────────────────────────────────────────────────

router.delete("/resources/:slug", requireAuth, async (req, res) => {
  const slug = req.params.slug as string;
  const userId = req.userDbId!;

  const resource = await db.query.resourcesTable.findFirst({
    where: eq(resourcesTable.slug, slug),
  });
  if (!resource) { res.status(404).json({ error: "Not found" }); return; }
  if (resource.authorId !== userId && !req.isAdmin) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  if (resource.filePath) {
    try {
      const objPath = filePathToObjectPath(resource.filePath);
      const file = await objectStorageService.getObjectEntityFile(objPath);
      await file.delete();
    } catch { /* ignore */ }
  }

  await db.delete(resourcesTable).where(eq(resourcesTable.id, resource.id));
  res.status(204).send();
});

// ── GET /admin/resources ──────────────────────────────────────────────────────

router.get("/admin/resources", requireAdmin, async (_req, res) => {
  const rows = await db
    .select()
    .from(resourcesTable)
    .where(eq(resourcesTable.published, false))
    .orderBy(desc(resourcesTable.createdAt));
  const enriched = await Promise.all(rows.map(enrichResource));
  res.json(enriched);
});

// ── POST /admin/resources/:slug/publish ───────────────────────────────────────

router.post("/admin/resources/:slug/publish", requireAdmin, async (req, res) => {
  const slug = req.params.slug as string;

  const resource = await db.query.resourcesTable.findFirst({
    where: eq(resourcesTable.slug, slug),
  });
  if (!resource) { res.status(404).json({ error: "Not found" }); return; }

  const [updated] = await db
    .update(resourcesTable)
    .set({ published: true })
    .where(eq(resourcesTable.id, resource.id))
    .returning();

  // update file ACL to public-read
  if (resource.filePath) {
    try {
      const objPath = filePathToObjectPath(resource.filePath);
      const file = await objectStorageService.getObjectEntityFile(objPath);
      await setObjectAclPolicy(file, {
        owner: resource.authorId,
        visibility: "public",
      });
    } catch { /* ignore */ }
  }

  notify({
    recipientId: resource.authorId,
    type: "resource_status",
    title: "Recurso aprobado",
    body: `Tu recurso "${resource.title}" ha sido publicado.`,
    link: `/recursos/${resource.slug}`,
  }).catch(() => {});

  res.json(await enrichResource(updated));
});

// ── POST /admin/resources/:slug/reject ────────────────────────────────────────

router.post("/admin/resources/:slug/reject", requireAdmin, async (req, res) => {
  const slug = req.params.slug as string;
  const { reason } = req.body as { reason: string };

  const resource = await db.query.resourcesTable.findFirst({
    where: eq(resourcesTable.slug, slug),
  });
  if (!resource) { res.status(404).json({ error: "Not found" }); return; }

  if (resource.filePath) {
    try {
      const objPath = filePathToObjectPath(resource.filePath);
      const file = await objectStorageService.getObjectEntityFile(objPath);
      await file.delete();
    } catch { /* ignore */ }
  }

  await db.delete(resourcesTable).where(eq(resourcesTable.id, resource.id));

  notify({
    recipientId: resource.authorId,
    type: "resource_status",
    title: "Recurso rechazado",
    body: `Tu recurso "${resource.title}" fue rechazado. Motivo: ${reason}`,
  }).catch(() => {});

  res.status(204).send();
});

export default router;
