import { Router } from "express";
import { eq, ilike, and, sql, desc, lt, gt } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";
import {
  db,
  usersTable,
  eventsTable,
  forumThreadsTable,
  forumPostsTable,
  resourcesTable,
  marketplaceListingsTable,
  moderationItemsTable,
  reportsTable,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/requireAuth";
import { notify } from "../lib/notify";
import { randomUUID } from "crypto";

const router = Router();

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ── Metrics ───────────────────────────────────────────────────────────────────

router.get("/admin/metrics", requireAdmin, async (_req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    [totalRow],
    [cur30Row],
    [prev30Row],
    [upcomingRow],
    [active7dRow],
    [pendingListingsRow],
    [pendingResourcesRow],
    [openReportsRow],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(usersTable),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(gt(usersTable.joinedAt, thirtyDaysAgo)),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(and(gt(usersTable.joinedAt, sixtyDaysAgo), lt(usersTable.joinedAt, thirtyDaysAgo))),
    db.select({ count: sql<number>`count(*)` }).from(eventsTable).where(gt(eventsTable.startsAt, now)),
    db.select({ count: sql<number>`count(*)` }).from(forumThreadsTable).where(gt(forumThreadsTable.createdAt, sevenDaysAgo)),
    db.select({ count: sql<number>`count(*)` }).from(marketplaceListingsTable).where(eq(marketplaceListingsTable.status, "pending")),
    db.select({ count: sql<number>`count(*)` }).from(resourcesTable).where(eq(resourcesTable.published, false)),
    db.select({ count: sql<number>`count(*)` }).from(reportsTable).where(eq(reportsTable.status, "open")),
  ]);

  const cur = Number(cur30Row?.count ?? 0);
  const prev = Number(prev30Row?.count ?? 0);
  const members30dGrowth = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

  res.json({
    totalMembers: Number(totalRow?.count ?? 0),
    members30dGrowth,
    upcomingEvents: Number(upcomingRow?.count ?? 0),
    activeThreads7d: Number(active7dRow?.count ?? 0),
    pendingListings: Number(pendingListingsRow?.count ?? 0),
    pendingResources: Number(pendingResourcesRow?.count ?? 0),
    openReports: Number(openReportsRow?.count ?? 0),
  });
});

// ── Stats (legacy) ────────────────────────────────────────────────────────────

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [newUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(gt(usersTable.joinedAt, oneWeekAgo));
  const [totalEvents] = await db.select({ count: sql<number>`count(*)` }).from(eventsTable);
  const [upcomingEvents] = await db.select({ count: sql<number>`count(*)` }).from(eventsTable).where(gt(eventsTable.startsAt, now));
  const [totalPosts] = await db.select({ count: sql<number>`count(*)` }).from(forumThreadsTable);
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

// ── Users ─────────────────────────────────────────────────────────────────────

router.get("/admin/users", requireAdmin, async (req, res) => {
  const { q, role, cursor, limit = "50" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 50, 200);

  const conditions = [];
  if (q) conditions.push(ilike(usersTable.displayName, `%${q}%`));
  if (role) conditions.push(eq(usersTable.role, role));
  if (cursor) conditions.push(lt(usersTable.joinedAt, new Date(cursor)));

  const where = conditions.length > 1 ? and(...conditions) : conditions[0];

  const users = await db.query.usersTable.findMany({
    where,
    limit: lim + 1,
    orderBy: desc(usersTable.joinedAt),
  });

  const hasMore = users.length > lim;
  const page = hasMore ? users.slice(0, lim) : users;
  const nextCursor = hasMore ? page[page.length - 1]?.joinedAt?.toISOString() : null;

  res.json({ users: page, nextCursor, total: page.length });
});

// PATCH /admin/users/:id/role — update DB + Clerk publicMetadata
router.patch("/admin/users/:userId/role", requireAdmin, async (req, res) => {
  const userId = req.params.userId as string;

  if (userId === req.userId) {
    res.status(403).json({ error: "You cannot modify your own admin status." });
    return;
  }

  const { role } = req.body as { role: string };

  if (!["participant", "administrator"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(usersTable.clerkId, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    await clerk.users.updateUser(userId, { publicMetadata: { role } });
  } catch (err) {
    req.log?.warn({ err }, "Clerk updateUser metadata failed");
  }

  res.json(updated);
});

// Legacy PUT for backward compatibility with existing frontend hooks
router.put("/admin/users/:userId/role", requireAdmin, async (req, res) => {
  const userId = req.params.userId as string;

  if (userId === req.userId) {
    res.status(403).json({ error: "You cannot modify your own admin status." });
    return;
  }

  const { role } = req.body as { role: string };

  if (!["participant", "administrator"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(usersTable.clerkId, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    await clerk.users.updateUser(userId, { publicMetadata: { role } });
  } catch (err) {
    req.log?.warn({ err }, "Clerk updateUser metadata failed");
  }

  res.json(updated);
});

// POST /admin/users/:id/disable — set disabled_at + Clerk lockUser
router.post("/admin/users/:userId/disable", requireAdmin, async (req, res) => {
  const userId = req.params.userId as string;

  if (userId === req.userId) {
    res.status(403).json({ error: "You cannot modify your own admin status." });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ disabledAt: new Date(), updatedAt: new Date() })
    .where(eq(usersTable.clerkId, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    await clerk.users.lockUser(userId);
  } catch (err) {
    req.log?.warn({ err }, "Clerk lockUser failed");
  }

  res.json(updated);
});

// Legacy ban endpoint
router.post("/admin/users/:userId/ban", requireAdmin, async (req, res) => {
  const userId = req.params.userId as string;

  if (userId === req.userId) {
    res.status(403).json({ error: "You cannot modify your own admin status." });
    return;
  }

  await db
    .update(usersTable)
    .set({ isBanned: true, updatedAt: new Date() })
    .where(eq(usersTable.clerkId, userId));

  try {
    await clerk.users.banUser(userId);
  } catch (err) {
    req.log?.warn({ err }, "Clerk banUser failed");
  }

  res.status(204).send();
});

// ── Moderation queue (unified) ────────────────────────────────────────────────

router.get("/admin/moderation/queue", requireAdmin, async (_req, res) => {
  const [pendingListings, pendingResources, openReports] = await Promise.all([
    db.query.marketplaceListingsTable.findMany({
      where: eq(marketplaceListingsTable.status, "pending"),
      orderBy: desc(marketplaceListingsTable.createdAt),
    }),
    db.query.resourcesTable.findMany({
      where: eq(resourcesTable.published, false),
      orderBy: desc(resourcesTable.createdAt),
    }),
    db.query.reportsTable.findMany({
      where: eq(reportsTable.status, "open"),
      orderBy: desc(reportsTable.createdAt),
    }),
  ]);

  res.json({
    listings: pendingListings,
    resources: pendingResources,
    reports: openReports,
  });
});

// POST /admin/reports/:id/resolve
router.post("/admin/reports/:reportId/resolve", requireAdmin, async (req, res) => {
  const reportId = req.params.reportId as string;
  const { action } = req.body as { action: "remove" | "dismiss" };

  const report = await db.query.reportsTable.findFirst({
    where: eq(reportsTable.id, reportId),
  });

  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  const newStatus = action === "remove" ? "resolved" : "dismissed";

  await db
    .update(reportsTable)
    .set({ status: newStatus, resolvedAt: new Date() })
    .where(eq(reportsTable.id, reportId));

  // Soft-delete the target if action === 'remove'
  if (action === "remove") {
    if (report.targetType === "forum_post") {
      await db
        .update(forumPostsTable)
        .set({ body: "[eliminado por moderación]" })
        .where(eq(forumPostsTable.id, report.targetId));
    } else if (report.targetType === "forum_thread") {
      await db
        .update(forumThreadsTable)
        .set({ body: "[eliminado por moderación]" })
        .where(eq(forumThreadsTable.id, report.targetId));
    } else if (report.targetType === "listing") {
      await db
        .update(marketplaceListingsTable)
        .set({ status: "rejected" })
        .where(eq(marketplaceListingsTable.id, report.targetId));
    }
  }

  // Notify reporter of outcome
  const reporterUser = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, report.reporterId),
    columns: { id: true },
  });

  if (reporterUser) {
    const outcomeText =
      action === "remove"
        ? "El contenido que reportaste ha sido eliminado por un moderador."
        : "El contenido que reportaste fue revisado y no se tomó acción.";

    await notify({
      recipientId: reporterUser.id,
      type: "admin_action",
      title: "Tu reporte fue procesado",
      body: outcomeText,
    });
  }

  res.json({ status: newStatus });
});

// ── Legacy moderation (moderation_items table) ────────────────────────────────

router.post("/admin/moderation/:itemId/resolve", requireAdmin, async (req, res) => {
  const itemId = req.params.itemId as string;
  const { action, note } = req.body;
  const status = action === "remove" ? "resolved_remove" : "resolved_keep";
  await db
    .update(moderationItemsTable)
    .set({ status, note, resolvedBy: req.userId!, resolvedAt: new Date() })
    .where(eq(moderationItemsTable.id, itemId));
  res.status(204).send();
});

export default router;
