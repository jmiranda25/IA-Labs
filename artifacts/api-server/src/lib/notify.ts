import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { sseClients } from "../routes/notifications";

// TODO: when scaling beyond a single instance, swap the in-process pub/sub
// below for Redis pub/sub (e.g. ioredis subscribe/publish) so notifications
// reach the correct SSE-connected instance.

export interface NotifyOptions {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}

const DEFAULT_PREFS: Record<string, boolean> = {
  forum_reply: true,
  event_rsvp: true,
  marketplace_message: true,
  admin_action: true,
  resource_status: true,
  listing_status: true,
};

export async function notify({ recipientId, type, title, body, link }: NotifyOptions) {
  const recipient = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, recipientId),
    columns: { notificationPreferences: true },
  });

  const prefs = (recipient?.notificationPreferences as Record<string, boolean> | null) ?? DEFAULT_PREFS;
  // If the key is explicitly false, skip insert + push
  if (prefs[type] === false) return;

  const [row] = await db
    .insert(notificationsTable)
    .values({ id: randomUUID(), userId: recipientId, type, title, body, link: link ?? null, isRead: false })
    .returning();

  const clients = sseClients.get(recipientId);
  if (clients) {
    const payload = JSON.stringify(row);
    for (const client of clients) {
      client.write(`event: notification\ndata: ${payload}\n\n`);
    }
  }
}
