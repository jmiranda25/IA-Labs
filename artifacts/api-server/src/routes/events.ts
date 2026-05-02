import { Router } from "express";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import { db, eventsTable, eventRsvpsTable, usersTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

function buildEventStatus(event: { startAt: Date; endAt: Date; status: string }) {
  const now = new Date();
  if (event.status === "cancelled") return "cancelled";
  if (event.endAt < now) return "past";
  if (event.startAt <= now && event.endAt >= now) return "ongoing";
  return "upcoming";
}

async function enrichEvent(event: typeof eventsTable.$inferSelect, userId?: string) {
  const host = await db.query.usersTable.findFirst({ where: eq(usersTable.id, event.hostId) });
  const [attendeeResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventRsvpsTable)
    .where(and(eq(eventRsvpsTable.eventId, event.id), eq(eventRsvpsTable.status, "going")));

  let myRsvp: string | null = null;
  if (userId) {
    const rsvp = await db.query.eventRsvpsTable.findFirst({
      where: and(eq(eventRsvpsTable.eventId, event.id), eq(eventRsvpsTable.userId, userId)),
    });
    myRsvp = rsvp?.status ?? null;
  }

  return {
    ...event,
    hostName: host?.displayName ?? "Unknown",
    attendeeCount: Number(attendeeResult?.count ?? 0),
    status: buildEventStatus(event),
    myRsvp,
  };
}

// GET /events
router.get("/events", requireAuth, async (req, res) => {
  const { status = "upcoming", limit = "12", offset = "0" } = req.query as Record<string, string>;
  const userId = req.userId;
  const now = new Date();
  let where;
  if (status === "upcoming") where = gte(eventsTable.startAt, now);
  else if (status === "past") where = lte(eventsTable.endAt, now);

  const events = await db.query.eventsTable.findMany({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    orderBy: eventsTable.startAt,
  });
  const total = await db.select({ count: sql<number>`count(*)` }).from(eventsTable).where(where);
  const enriched = await Promise.all(events.map((e) => enrichEvent(e, userId)));
  res.json({ events: enriched, total: Number(total[0]?.count ?? 0) });
});

// POST /events
router.post("/events", requireAdmin, async (req, res) => {
  const { title, description, startAt, endAt, location, isVirtual, virtualLink, coverUrl, maxAttendees } = req.body;
  const [event] = await db.insert(eventsTable).values({
    id: randomUUID(),
    title,
    description,
    startAt: new Date(startAt),
    endAt: new Date(endAt),
    location,
    isVirtual: isVirtual ?? false,
    virtualLink,
    coverUrl,
    maxAttendees,
    hostId: req.userId!,
  }).returning();
  res.status(201).json(await enrichEvent(event, req.userId));
});

// GET /events/upcoming
router.get("/events/upcoming", requireAuth, async (req, res) => {
  const { limit = "5" } = req.query as Record<string, string>;
  const now = new Date();
  const events = await db.query.eventsTable.findMany({
    where: gte(eventsTable.startAt, now),
    limit: parseInt(limit),
    orderBy: eventsTable.startAt,
  });
  const enriched = await Promise.all(events.map((e) => enrichEvent(e, req.userId)));
  res.json(enriched);
});

// GET /events/:eventId
router.get("/events/:eventId", requireAuth, async (req, res) => {
  const eventId = req.params.eventId as string;
  const event = await db.query.eventsTable.findFirst({ where: eq(eventsTable.id, eventId) });
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichEvent(event, req.userId));
});

// PUT /events/:eventId
router.put("/events/:eventId", requireAdmin, async (req, res) => {
  const eventId = req.params.eventId as string;
  const [event] = await db.update(eventsTable).set({ ...req.body, updatedAt: new Date() })
    .where(eq(eventsTable.id, eventId)).returning();
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichEvent(event, req.userId));
});

// DELETE /events/:eventId
router.delete("/events/:eventId", requireAdmin, async (req, res) => {
  const eventId = req.params.eventId as string;
  await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
  res.status(204).send();
});

// PUT /events/:eventId/rsvp
router.put("/events/:eventId/rsvp", requireAuth, async (req, res) => {
  const eventId = req.params.eventId as string;
  const { status } = req.body;
  const existing = await db.query.eventRsvpsTable.findFirst({
    where: and(eq(eventRsvpsTable.eventId, eventId), eq(eventRsvpsTable.userId, req.userId!)),
  });
  let rsvp;
  if (existing) {
    [rsvp] = await db.update(eventRsvpsTable).set({ status, updatedAt: new Date() })
      .where(eq(eventRsvpsTable.id, existing.id)).returning();
  } else {
    [rsvp] = await db.insert(eventRsvpsTable).values({
      id: randomUUID(),
      eventId,
      userId: req.userId!,
      status,
    }).returning();
  }
  res.json(rsvp);
});

// DELETE /events/:eventId/rsvp
router.delete("/events/:eventId/rsvp", requireAuth, async (req, res) => {
  const eventId = req.params.eventId as string;
  await db.delete(eventRsvpsTable).where(
    and(eq(eventRsvpsTable.eventId, eventId), eq(eventRsvpsTable.userId, req.userId!))
  );
  res.status(204).send();
});

// GET /events/:eventId/attendees
router.get("/events/:eventId/attendees", requireAuth, async (req, res) => {
  const eventId = req.params.eventId as string;
  const rsvps = await db.query.eventRsvpsTable.findMany({
    where: and(eq(eventRsvpsTable.eventId, eventId), eq(eventRsvpsTable.status, "going")),
  });
  const enriched = await Promise.all(rsvps.map(async (r) => {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, r.userId) });
    return { ...r, user };
  }));
  res.json(enriched);
});

export default router;
