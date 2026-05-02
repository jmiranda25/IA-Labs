import { Router } from "express";
import { eq, ilike, sql, and, or, desc, lt, isNull } from "drizzle-orm";
import {
  db, marketplaceListingsTable, listingImagesTable, listingMessagesTable, usersTable,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/requireAuth";
import { randomUUID } from "crypto";
import multer from "multer";
import { ObjectStorageService } from "../lib/objectStorage";
import { pushNotification } from "./notifications";

const objectStorageService = new ObjectStorageService();

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) +
    "-" +
    randomUUID().slice(0, 6)
  );
}

async function enrichListing(l: typeof marketplaceListingsTable.$inferSelect) {
  const [seller, images] = await Promise.all([
    db.query.usersTable.findFirst({ where: eq(usersTable.id, l.sellerId) }),
    db.query.listingImagesTable.findMany({
      where: eq(listingImagesTable.listingId, l.id),
      orderBy: listingImagesTable.orderIndex,
    }),
  ]);
  return {
    ...l,
    sellerName: seller?.displayName ?? "Unknown",
    sellerAvatar: seller?.avatarUrl ?? null,
    sellerUsername: seller?.username ?? null,
    images,
  };
}

// GET /marketplace/listings
router.get("/marketplace/listings", requireAuth, async (req, res) => {
  const { q, category, minPrice, maxPrice, cursor, limit = "20" } = req.query as Record<string, string>;
  const userId = req.userId!;
  const lim = Math.min(parseInt(limit) || 20, 50);

  const conditions: ReturnType<typeof eq>[] = [
    or(
      eq(marketplaceListingsTable.status, "active"),
      eq(marketplaceListingsTable.sellerId, userId),
    )!,
  ];
  if (q) {
    conditions.push(
      or(
        ilike(marketplaceListingsTable.title, `%${q}%`),
        ilike(marketplaceListingsTable.description, `%${q}%`),
      )!,
    );
  }
  if (category) conditions.push(eq(marketplaceListingsTable.category, category));
  if (minPrice) conditions.push(sql`${marketplaceListingsTable.price}::numeric >= ${parseFloat(minPrice)}` as any);
  if (maxPrice) conditions.push(sql`${marketplaceListingsTable.price}::numeric <= ${parseFloat(maxPrice)}` as any);

  if (cursor) {
    try {
      const { createdAt, id } = JSON.parse(Buffer.from(cursor, "base64").toString());
      conditions.push(
        or(
          lt(marketplaceListingsTable.createdAt, new Date(createdAt)),
          and(
            eq(marketplaceListingsTable.createdAt, new Date(createdAt)),
            lt(marketplaceListingsTable.id, id),
          ),
        )!,
      );
    } catch {
      /* ignore bad cursor */
    }
  }

  const where = and(...conditions);
  const rows = await db.query.marketplaceListingsTable.findMany({
    where,
    limit: lim + 1,
    orderBy: [desc(marketplaceListingsTable.createdAt)],
  });

  const hasMore = rows.length > lim;
  const page = hasMore ? rows.slice(0, lim) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last
    ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id })).toString("base64")
    : null;

  const enriched = await Promise.all(page.map(enrichListing));
  res.json({ listings: enriched, nextCursor });
});

// GET /marketplace/my-listings
router.get("/marketplace/my-listings", requireAuth, async (req, res) => {
  const rows = await db.query.marketplaceListingsTable.findMany({
    where: eq(marketplaceListingsTable.sellerId, req.userId!),
    orderBy: desc(marketplaceListingsTable.createdAt),
  });
  const enriched = await Promise.all(rows.map(enrichListing));
  res.json(enriched);
});

// GET /marketplace/listings/:slug
router.get("/marketplace/listings/:slug", requireAuth, async (req, res) => {
  const listing = await db.query.marketplaceListingsTable.findFirst({
    where: eq(marketplaceListingsTable.slug, req.params.slug as string),
  });
  if (!listing) { res.status(404).json({ error: "Not found" }); return; }
  if (listing.status !== "active" && listing.sellerId !== req.userId && !req.isAdmin) {
    res.status(404).json({ error: "Not found" }); return;
  }
  res.json(await enrichListing(listing));
});

// POST /marketplace/listings
router.post("/marketplace/listings", requireAuth, async (req, res) => {
  const { title, description, price, currency = "USD", category } = req.body;
  const slug = slugify(title);
  const [listing] = await db
    .insert(marketplaceListingsTable)
    .values({
      id: randomUUID(),
      sellerId: req.userId!,
      title,
      slug,
      description,
      price: price != null ? String(price) : null,
      currency,
      category,
      status: "pending",
    })
    .returning();
  res.status(201).json(await enrichListing(listing));
});

// PATCH /marketplace/listings/:slug
router.patch("/marketplace/listings/:slug", requireAuth, async (req, res) => {
  const slug = req.params.slug as string;
  const listing = await db.query.marketplaceListingsTable.findFirst({
    where: eq(marketplaceListingsTable.slug, slug),
  });
  if (!listing) { res.status(404).json({ error: "Not found" }); return; }
  if (listing.sellerId !== req.userId && !req.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

  const { title, description, price, currency, category } = req.body;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) patch.title = title;
  if (description !== undefined) patch.description = description;
  if (price !== undefined) patch.price = price != null ? String(price) : null;
  if (currency !== undefined) patch.currency = currency;
  if (category !== undefined) patch.category = category;

  const [updated] = await db
    .update(marketplaceListingsTable)
    .set(patch)
    .where(eq(marketplaceListingsTable.slug, slug))
    .returning();
  res.json(await enrichListing(updated));
});

// POST /marketplace/listings/:slug/images  (max 6)
router.post(
  "/marketplace/listings/:slug/images",
  requireAuth,
  upload.array("images", 6),
  async (req, res) => {
    const slug = req.params.slug as string;
    const listing = await db.query.marketplaceListingsTable.findFirst({
      where: eq(marketplaceListingsTable.slug, slug),
    });
    if (!listing) { res.status(404).json({ error: "Not found" }); return; }
    if (listing.sellerId !== req.userId && !req.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

    const existing = await db.query.listingImagesTable.findMany({
      where: eq(listingImagesTable.listingId, listing.id),
    });
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (existing.length + files.length > 6) {
      res.status(400).json({ error: "Máximo 6 imágenes por anuncio" }); return;
    }

    const inserted = await Promise.all(
      files.map(async (file, i) => {
        const ext =
          file.mimetype === "image/png" ? "png"
          : file.mimetype === "image/webp" ? "webp"
          : "jpg";
        const subPath = `marketplace/${listing.id}/${randomUUID()}.${ext}`;
        await objectStorageService.uploadToPrivate(subPath, file.buffer, file.mimetype, {
          owner: req.userId!,
          visibility: "public",
        });
        const url = `/api/storage/objects/${subPath}`;
        const [img] = await db
          .insert(listingImagesTable)
          .values({ id: randomUUID(), listingId: listing.id, url, orderIndex: existing.length + i })
          .returning();
        return img;
      }),
    );
    res.json(inserted);
  },
);

// POST /marketplace/listings/:slug/sold
router.post("/marketplace/listings/:slug/sold", requireAuth, async (req, res) => {
  const slug = req.params.slug as string;
  const listing = await db.query.marketplaceListingsTable.findFirst({
    where: eq(marketplaceListingsTable.slug, slug),
  });
  if (!listing) { res.status(404).json({ error: "Not found" }); return; }
  if (listing.sellerId !== req.userId) { res.status(403).json({ error: "Solo el vendedor puede marcar como vendido" }); return; }

  const [updated] = await db
    .update(marketplaceListingsTable)
    .set({ status: "sold", updatedAt: new Date() })
    .where(eq(marketplaceListingsTable.slug, slug))
    .returning();
  res.json(await enrichListing(updated));
});

// POST /marketplace/listings/:slug/messages
router.post("/marketplace/listings/:slug/messages", requireAuth, async (req, res) => {
  const slug = req.params.slug as string;
  const listing = await db.query.marketplaceListingsTable.findFirst({
    where: eq(marketplaceListingsTable.slug, slug),
  });
  if (!listing) { res.status(404).json({ error: "Not found" }); return; }

  const { body, toId } = req.body as { body: string; toId: string };
  const fromId = req.userId!;

  if (fromId !== listing.sellerId && toId !== listing.sellerId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  if (fromId === toId) { res.status(400).json({ error: "No puedes mensajearte a ti mismo" }); return; }

  const [msg] = await db
    .insert(listingMessagesTable)
    .values({ id: randomUUID(), listingId: listing.id, fromId, toId, body })
    .returning();

  const sender = await db.query.usersTable.findFirst({ where: eq(usersTable.id, fromId) });
  pushNotification(toId, {
    type: "message_received",
    title: "Nuevo mensaje",
    body: `${sender?.displayName ?? "Alguien"}: ${body.slice(0, 80)}`,
    link: `/mensajes/${listing.id}/${fromId}`,
  });

  res.status(201).json({ ...msg, fromName: sender?.displayName ?? "Unknown", fromAvatar: sender?.avatarUrl ?? null });
});

// GET /messages/threads
router.get("/messages/threads", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const msgs = await db.query.listingMessagesTable.findMany({
    where: or(eq(listingMessagesTable.fromId, userId), eq(listingMessagesTable.toId, userId)),
    orderBy: desc(listingMessagesTable.createdAt),
  });

  const threadMap = new Map<
    string,
    { listingId: string; otherUserId: string; lastMessage: string; unreadCount: number; updatedAt: Date }
  >();
  for (const m of msgs) {
    const otherUserId = m.fromId === userId ? m.toId : m.fromId;
    const key = `${m.listingId}:${otherUserId}`;
    const existing = threadMap.get(key);
    if (!existing) {
      threadMap.set(key, {
        listingId: m.listingId,
        otherUserId,
        lastMessage: m.body,
        unreadCount: !m.readAt && m.toId === userId ? 1 : 0,
        updatedAt: m.createdAt,
      });
    } else {
      if (!m.readAt && m.toId === userId) existing.unreadCount++;
    }
  }

  const threads = await Promise.all(
    Array.from(threadMap.values()).map(async (t) => {
      const [listing, other] = await Promise.all([
        db.query.marketplaceListingsTable.findFirst({ where: eq(marketplaceListingsTable.id, t.listingId) }),
        db.query.usersTable.findFirst({ where: eq(usersTable.id, t.otherUserId) }),
      ]);
      return {
        ...t,
        listingSlug: listing?.slug ?? "",
        listingTitle: listing?.title ?? "",
        otherUserName: other?.displayName ?? "Unknown",
        otherUserAvatar: other?.avatarUrl ?? null,
        otherUserUsername: other?.username ?? null,
      };
    }),
  );
  res.json(threads);
});

// GET /messages/threads/:listingId/:otherUserId
router.get("/messages/threads/:listingId/:otherUserId", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { listingId, otherUserId } = req.params as { listingId: string; otherUserId: string };

  // Explicit admin block — admins cannot read private messages unless participant
  if (req.isAdmin && userId !== otherUserId) {
    const isParticipant = await db.query.listingMessagesTable.findFirst({
      where: and(
        eq(listingMessagesTable.listingId, listingId),
        or(eq(listingMessagesTable.fromId, userId), eq(listingMessagesTable.toId, userId)),
      ),
    });
    if (!isParticipant) {
      res.status(403).json({ error: "Los admins no pueden leer mensajes privados" }); return;
    }
  }

  const msgs = await db.query.listingMessagesTable.findMany({
    where: and(
      eq(listingMessagesTable.listingId, listingId),
      or(
        and(eq(listingMessagesTable.fromId, userId), eq(listingMessagesTable.toId, otherUserId)),
        and(eq(listingMessagesTable.fromId, otherUserId), eq(listingMessagesTable.toId, userId)),
      ),
    ),
    orderBy: listingMessagesTable.createdAt,
  });

  // Mark incoming messages as read
  await db
    .update(listingMessagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(listingMessagesTable.listingId, listingId),
        eq(listingMessagesTable.toId, userId),
        isNull(listingMessagesTable.readAt),
      ),
    );

  const enriched = await Promise.all(
    msgs.map(async (m) => {
      const from = await db.query.usersTable.findFirst({ where: eq(usersTable.id, m.fromId) });
      return { ...m, fromName: from?.displayName ?? "Unknown", fromAvatar: from?.avatarUrl ?? null };
    }),
  );
  res.json(enriched);
});

// GET /admin/marketplace/listings
router.get("/admin/marketplace/listings", requireAdmin, async (_req, res) => {
  const rows = await db.query.marketplaceListingsTable.findMany({
    where: eq(marketplaceListingsTable.status, "pending"),
    orderBy: desc(marketplaceListingsTable.createdAt),
  });
  const enriched = await Promise.all(rows.map(enrichListing));
  res.json(enriched);
});

// POST /admin/marketplace/listings/:slug/approve
router.post("/admin/marketplace/listings/:slug/approve", requireAdmin, async (req, res) => {
  const slug = req.params.slug as string;
  const listing = await db.query.marketplaceListingsTable.findFirst({
    where: eq(marketplaceListingsTable.slug, slug),
  });
  if (!listing) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db
    .update(marketplaceListingsTable)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(marketplaceListingsTable.slug, slug))
    .returning();
  pushNotification(listing.sellerId, {
    type: "admin_action",
    title: "Anuncio aprobado",
    body: `Tu anuncio "${listing.title}" ha sido aprobado y ya está activo.`,
    link: `/marketplace/${listing.slug}`,
  });
  res.json(await enrichListing(updated));
});

// POST /admin/marketplace/listings/:slug/reject
router.post("/admin/marketplace/listings/:slug/reject", requireAdmin, async (req, res) => {
  const slug = req.params.slug as string;
  const { reason } = req.body as { reason: string };
  const listing = await db.query.marketplaceListingsTable.findFirst({
    where: eq(marketplaceListingsTable.slug, slug),
  });
  if (!listing) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db
    .update(marketplaceListingsTable)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(marketplaceListingsTable.slug, slug))
    .returning();
  pushNotification(listing.sellerId, {
    type: "admin_action",
    title: "Anuncio rechazado",
    body: `Tu anuncio "${listing.title}" fue rechazado. Motivo: ${reason}`,
    link: `/marketplace/mis-anuncios`,
  });
  res.json(await enrichListing(updated));
});

export default router;
