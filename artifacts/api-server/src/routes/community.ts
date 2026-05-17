import { Router } from "express";
import { sql, desc } from "drizzle-orm";
import { db, usersTable, eventsTable, forumThreadsTable, resourcesTable, marketplaceListingsTable } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

// GET /community/stats
router.get("/community/stats", requireAuth, async (_req, res) => {
  const [members] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [events] = await db.select({ count: sql<number>`count(*)` }).from(eventsTable);
  const [posts] = await db.select({ count: sql<number>`count(*)` }).from(forumThreadsTable);
  const [resources] = await db.select({ count: sql<number>`count(*)` }).from(resourcesTable);
  const [listings] = await db.select({ count: sql<number>`count(*)` }).from(marketplaceListingsTable);
  res.json({
    memberCount: Number(members?.count ?? 0),
    eventCount: Number(events?.count ?? 0),
    forumPostCount: Number(posts?.count ?? 0),
    resourceCount: Number(resources?.count ?? 0),
    listingCount: Number(listings?.count ?? 0),
  });
});

// GET /activity/feed
router.get("/activity/feed", requireAuth, async (req, res) => {
  const limit = parseInt((req.query.limit as string) ?? "20");
  // Aggregate recent activity from multiple tables
  const recentUsers = await db.query.usersTable.findMany({ limit: 5, orderBy: desc(usersTable.joinedAt) });
  const recentEvents = await db.query.eventsTable.findMany({ limit: 5, orderBy: desc(eventsTable.createdAt) });
  const recentPosts = await db.query.forumThreadsTable.findMany({ limit: 5, orderBy: desc(forumThreadsTable.createdAt) });
  const recentResources = await db.query.resourcesTable.findMany({ limit: 5, orderBy: desc(resourcesTable.createdAt) });
  const recentListings = await db.query.marketplaceListingsTable.findMany({ limit: 5, orderBy: desc(marketplaceListingsTable.createdAt) });

  const items: unknown[] = [];

  for (const u of recentUsers) {
    items.push({ id: `member_joined_${u.id}`, type: "member_joined", actorId: u.clerkId, actorName: u.displayName, actorAvatar: u.avatarUrl ?? null, title: `${u.displayName} se unió a la comunidad`, link: u.username ? `/miembros/${u.username}` : `/miembros`, createdAt: u.joinedAt.toISOString() });
  }
  for (const e of recentEvents) {
    items.push({ id: `event_${e.id}`, type: "event_created", actorId: e.createdBy, actorName: "", actorAvatar: null, title: `Nuevo evento: ${e.title}`, link: `/eventos/${e.slug}`, createdAt: e.createdAt.toISOString() });
  }
  for (const p of recentPosts) {
    items.push({ id: `forum_${p.id}`, type: "forum_post", actorId: p.authorId, actorName: "", actorAvatar: null, title: `Nuevo tema: ${p.title}`, link: `/foro`, createdAt: p.createdAt.toISOString() });
  }
  for (const r of recentResources) {
    items.push({ id: `resource_${r.id}`, type: "resource_uploaded", actorId: r.authorId, actorName: "", actorAvatar: null, title: `Nuevo recurso: ${r.title}`, link: `/recursos/${r.slug}`, createdAt: r.createdAt.toISOString() });
  }
  for (const l of recentListings) {
    items.push({ id: `listing_${l.id}`, type: "listing_created", actorId: l.sellerId, actorName: "", actorAvatar: null, title: `Nuevo anuncio: ${l.title}`, link: `/marketplace/${l.slug}`, createdAt: l.createdAt.toISOString() });
  }

  items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(items.slice(0, limit));
});

export default router;
