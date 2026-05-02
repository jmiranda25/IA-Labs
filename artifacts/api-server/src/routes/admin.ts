import { Router } from "express";
import { eq, ilike, sql, desc } from "drizzle-orm";
import { db, usersTable, eventsTable, forumPostsTable, resourcesTable, marketplaceListingsTable, moderationItemsTable } from "@workspace/db";
import { requireAdmin } from "../lib/requireAuth";

const router = Router();

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (_req, res) => {
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [newUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(sql`joined_at > ${oneWeekAgo}`);
  const [totalEvents] = await db.select({ count: sql<number>`count(*)` }).from(eventsTable);
  const [upcomingEvents] = await db.select({ count: sql<number>`count(*)` }).from(eventsTable).where(sql`start_at > now()`);
  const [totalPosts] = await db.select({ count: sql<number>`count(*)` }).from(forumPostsTable);
  const [pendingMod] = await db.select({ count: sql<number>`count(*)` }).from(moderationItemsTable).where(eq(moderationItemsTable.status, "pending"));
  const [totalResources] = await db.select({ count: sql<number>`count(*)` }).from(resourcesTable);
  const [totalListings] = await db.select({ count: sql<number>`count(*)` }).from(marketplaceListingsTable);

  res.json({
    totalUsers: Number(totalUsers?.count ?? 0),
    newUsersThisWeek: Number(newUsers?.count ?? 0),
    totalEvents: Number(totalEvents?.count ?? 0),
    upcomingEvents: Number(upcomingEvents?.count ?? 0),
    totalForumPosts: Number(totalPosts?.count ?? 0),
    pendingModerationItems: Number(pendingMod?.count ?? 0),
    totalResources: Number(totalResources?.count ?? 0),
    totalListings: Number(totalListings?.count ?? 0),
  });
});

// GET /admin/users
router.get("/admin/users", requireAdmin, async (req, res) => {
  const { search, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const where = search ? ilike(usersTable.displayName, `%${search}%`) : undefined;
  const users = await db.query.usersTable.findMany({ where, limit: parseInt(limit), offset: parseInt(offset), orderBy: desc(usersTable.joinedAt) });
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(where);
  res.json({ users, total: Number(total?.count ?? 0) });
});

// PUT /admin/users/:userId/role
router.put("/admin/users/:userId/role", requireAdmin, async (req, res) => {
  const userId = req.params.userId as string;
  const { role } = req.body;
  const [updated] = await db.update(usersTable).set({ role, updatedAt: new Date() })
    .where(eq(usersTable.clerkId, userId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// POST /admin/users/:userId/ban
router.post("/admin/users/:userId/ban", requireAdmin, async (req, res) => {
  const userId = req.params.userId as string;
  await db.update(usersTable).set({ isBanned: true, updatedAt: new Date() })
    .where(eq(usersTable.clerkId, userId));
  res.status(204).send();
});

// GET /admin/moderation/queue
router.get("/admin/moderation/queue", requireAdmin, async (_req, res) => {
  const items = await db.query.moderationItemsTable.findMany({
    where: eq(moderationItemsTable.status, "pending"),
    orderBy: desc(moderationItemsTable.createdAt),
  });
  res.json(items);
});

// POST /admin/moderation/:itemId/resolve
router.post("/admin/moderation/:itemId/resolve", requireAdmin, async (req, res) => {
  const itemId = req.params.itemId as string;
  const { action, note } = req.body;
  const status = action === "remove" ? "resolved_remove" : "resolved_keep";
  await db.update(moderationItemsTable).set({ status, note, resolvedBy: req.userId!, resolvedAt: new Date() })
    .where(eq(moderationItemsTable.id, itemId));
  res.status(204).send();
});

export default router;
