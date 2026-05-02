import { randomUUID } from "crypto";
import { db, notificationsTable } from "@workspace/db";
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

export async function notify({ recipientId, type, title, body, link }: NotifyOptions) {
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
