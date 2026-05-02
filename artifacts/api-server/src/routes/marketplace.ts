import { Router } from "express";
import { eq, ilike, sql, and, or, desc } from "drizzle-orm";
import { db, marketplaceListingsTable, marketplaceMessagesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

async function enrichListing(l: typeof marketplaceListingsTable.$inferSelect) {
  const author = await db.query.usersTable.findFirst({ where: eq(usersTable.id, l.authorId) });
  return { ...l, authorName: author?.displayName ?? "Unknown", authorAvatar: author?.avatarUrl ?? null };
}

// GET /marketplace/listings
router.get("/marketplace/listings", async (req, res) => {
  const { search, type, status = "active", limit = "20", offset = "0" } = req.query as Record<string, string>;
  const conditions = [];
  if (search) conditions.push(or(ilike(marketplaceListingsTable.title, `%${search}%`), ilike(marketplaceListingsTable.description, `%${search}%`)));
  if (type) conditions.push(eq(marketplaceListingsTable.type, type));
  if (status !== "all") conditions.push(eq(marketplaceListingsTable.status, status));
  const where = conditions.length ? and(...conditions) : undefined;
  const listings = await db.query.marketplaceListingsTable.findMany({ where, limit: parseInt(limit), offset: parseInt(offset), orderBy: desc(marketplaceListingsTable.createdAt) });
  const total = await db.select({ count: sql<number>`count(*)` }).from(marketplaceListingsTable).where(where);
  const enriched = await Promise.all(listings.map(enrichListing));
  res.json({ listings: enriched, total: Number(total[0]?.count ?? 0) });
});

// POST /marketplace/listings
router.post("/marketplace/listings", requireAuth, async (req, res) => {
  const { title, description, type, tags, imageUrl } = req.body;
  const [listing] = await db.insert(marketplaceListingsTable).values({
    id: randomUUID(), title, description, type, tags: tags ?? [], imageUrl, authorId: req.userId!,
  }).returning();
  res.status(201).json(await enrichListing(listing));
});

// GET /marketplace/listings/featured
router.get("/marketplace/listings/featured", async (req, res) => {
  const { limit = "6" } = req.query as Record<string, string>;
  const listings = await db.query.marketplaceListingsTable.findMany({
    where: eq(marketplaceListingsTable.status, "active"),
    limit: parseInt(limit),
    orderBy: desc(marketplaceListingsTable.createdAt),
  });
  const enriched = await Promise.all(listings.map(enrichListing));
  res.json(enriched);
});

// GET /marketplace/listings/:listingId
router.get("/marketplace/listings/:listingId", async (req, res) => {
  const listingId = req.params.listingId as string;
  const listing = await db.query.marketplaceListingsTable.findFirst({ where: eq(marketplaceListingsTable.id, listingId) });
  if (!listing) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichListing(listing));
});

// PUT /marketplace/listings/:listingId
router.put("/marketplace/listings/:listingId", requireAuth, async (req, res) => {
  const listingId = req.params.listingId as string;
  const [updated] = await db.update(marketplaceListingsTable).set({ ...req.body, updatedAt: new Date() })
    .where(eq(marketplaceListingsTable.id, listingId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichListing(updated));
});

// DELETE /marketplace/listings/:listingId
router.delete("/marketplace/listings/:listingId", requireAuth, async (req, res) => {
  const listingId = req.params.listingId as string;
  await db.delete(marketplaceListingsTable).where(eq(marketplaceListingsTable.id, listingId));
  res.status(204).send();
});

// GET /marketplace/messages
router.get("/marketplace/messages", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const msgs = await db.query.marketplaceMessagesTable.findMany({
    where: or(eq(marketplaceMessagesTable.senderId, userId), eq(marketplaceMessagesTable.receiverId, userId)),
    orderBy: desc(marketplaceMessagesTable.createdAt),
  });
  const threadMap = new Map<string, { listingId: string; otherUserId: string; lastMessage: string; unreadCount: number; updatedAt: Date }>();
  for (const m of msgs) {
    const otherUserId = m.senderId === userId ? m.receiverId : m.senderId;
    const existing = threadMap.get(m.listingId);
    if (!existing) {
      threadMap.set(m.listingId, { listingId: m.listingId, otherUserId, lastMessage: m.body, unreadCount: (!m.isRead && m.receiverId === userId) ? 1 : 0, updatedAt: m.createdAt });
    } else {
      if (!m.isRead && m.receiverId === userId) existing.unreadCount++;
    }
  }
  const threads = await Promise.all(Array.from(threadMap.values()).map(async (t) => {
    const listing = await db.query.marketplaceListingsTable.findFirst({ where: eq(marketplaceListingsTable.id, t.listingId) });
    const otherUser = await db.query.usersTable.findFirst({ where: eq(usersTable.id, t.otherUserId) });
    return { ...t, listingTitle: listing?.title ?? "", otherUserName: otherUser?.displayName ?? "Unknown", otherUserAvatar: otherUser?.avatarUrl ?? null };
  }));
  res.json(threads);
});

// GET /marketplace/messages/:listingId
router.get("/marketplace/messages/:listingId", requireAuth, async (req, res) => {
  const listingId = req.params.listingId as string;
  const userId = req.userId!;
  const msgs = await db.query.marketplaceMessagesTable.findMany({
    where: and(
      eq(marketplaceMessagesTable.listingId, listingId),
      or(eq(marketplaceMessagesTable.senderId, userId), eq(marketplaceMessagesTable.receiverId, userId))
    ),
    orderBy: marketplaceMessagesTable.createdAt,
  });
  const enriched = await Promise.all(msgs.map(async (m) => {
    const sender = await db.query.usersTable.findFirst({ where: eq(usersTable.id, m.senderId) });
    return { ...m, senderName: sender?.displayName ?? "Unknown", senderAvatar: sender?.avatarUrl ?? null };
  }));
  await db.update(marketplaceMessagesTable).set({ isRead: true })
    .where(and(eq(marketplaceMessagesTable.listingId, listingId), eq(marketplaceMessagesTable.receiverId, userId)));
  res.json(enriched);
});

// POST /marketplace/messages/:listingId
router.post("/marketplace/messages/:listingId", requireAuth, async (req, res) => {
  const listingId = req.params.listingId as string;
  const { receiverId, body } = req.body;
  const [msg] = await db.insert(marketplaceMessagesTable).values({
    id: randomUUID(), listingId, senderId: req.userId!, receiverId, body,
  }).returning();
  await db.update(marketplaceListingsTable).set({ messageCount: sql`message_count + 1` }).where(eq(marketplaceListingsTable.id, listingId));
  const sender = await db.query.usersTable.findFirst({ where: eq(usersTable.id, req.userId!) });
  res.status(201).json({ ...msg, senderName: sender?.displayName ?? "Unknown", senderAvatar: sender?.avatarUrl ?? null });
});

export default router;
