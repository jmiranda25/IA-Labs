import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

// SSE clients registry
export const sseClients = new Map<string, Set<ReturnType<typeof createSseClient>>>();

function createSseClient(res: ReturnType<Router["use"]> extends never ? never : Parameters<Parameters<Router["get"]>[1]>[1]) {
  return res;
}

// GET /notifications/stream — SSE endpoint
router.get("/notifications/stream", requireAuth, (req, res: any) => {
  const userId = req.userId!;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId)!.add(res);

  // Send heartbeat every 30s
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.get(userId)?.delete(res);
  });
});

export function pushNotification(userId: string, notification: unknown) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  const data = JSON.stringify(notification);
  for (const client of clients) {
    (client as any).write(`data: ${data}\n\n`);
  }
}

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
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, req.params.notificationId));
  res.status(204).send();
});

export default router;
