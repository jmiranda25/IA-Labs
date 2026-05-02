import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import type { Response } from "express";
import { db, notificationsTable } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

export const sseClients = new Map<string, Set<Response>>();

// GET /notifications/stream — SSE endpoint
router.get("/notifications/stream", requireAuth, (req, res: Response) => {
  const userId = req.userId!;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  (res as unknown as { flushHeaders?: () => void }).flushHeaders?.();

  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId)!.add(res);

  const keepalive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(keepalive);
    sseClients.get(userId)?.delete(res);
    if (sseClients.get(userId)?.size === 0) sseClients.delete(userId);
  });
});

// GET /notifications/unread-count
router.get("/notifications/unread-count", requireAuth, async (req, res) => {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, req.userId!), eq(notificationsTable.isRead, false)));
  res.json({ count: Number(row?.count ?? 0) });
});

// GET /notifications
router.get("/notifications", requireAuth, async (req, res) => {
  const { unreadOnly = "false", limit = "30" } = req.query as Record<string, string>;
  const conditions = [eq(notificationsTable.userId, req.userId!)];
  if (unreadOnly === "true") conditions.push(eq(notificationsTable.isRead, false));
  const notifications = await db.query.notificationsTable.findMany({
    where: and(...conditions),
    limit: parseInt(limit),
    orderBy: desc(notificationsTable.createdAt),
  });
  const [unreadResult] = await db.select({ count: sql<number>`count(*)` }).from(notificationsTable)
    .where(and(eq(notificationsTable.userId, req.userId!), eq(notificationsTable.isRead, false)));
  res.json({ notifications, unreadCount: Number(unreadResult?.count ?? 0) });
});

// POST /notifications/mark-all-read
router.post("/notifications/mark-all-read", requireAuth, async (req, res) => {
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, req.userId!));
  res.status(204).send();
});

// POST /notifications/:notificationId/read
router.post("/notifications/:notificationId/read", requireAuth, async (req, res) => {
  const notificationId = req.params.notificationId as string;
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, notificationId));
  res.status(204).send();
});

export default router;
