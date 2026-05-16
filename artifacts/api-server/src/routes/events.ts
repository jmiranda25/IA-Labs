import { Router } from "express";
import {
  eq,
  ilike,
  and,
  or,
  lt,
  gt,
  desc,
  asc,
  sql,
} from "drizzle-orm";
import { db, eventsTable, rsvpsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { notify } from "../lib/notify";
import { randomUUID } from "crypto";
import multer from "multer";

const router = Router();
const objectStorageService = new ObjectStorageService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let i = 2;
  while (true) {
    const existing = await db.query.eventsTable.findFirst({
      where: eq(eventsTable.slug, slug),
    });
    if (!existing || existing.id === excludeId) break;
    slug = `${base}-${i++}`;
  }
  return slug;
}

async function enrichEvent(
  event: typeof eventsTable.$inferSelect,
  userId?: string | null,
) {
  const [goingRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rsvpsTable)
    .where(
      and(eq(rsvpsTable.eventId, event.id), eq(rsvpsTable.status, "going")),
    );
  const [interestedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rsvpsTable)
    .where(
      and(
        eq(rsvpsTable.eventId, event.id),
        eq(rsvpsTable.status, "interested"),
      ),
    );

  let myRsvp: string | null = null;
  if (userId) {
    const rsvp = await db.query.rsvpsTable.findFirst({
      where: and(
        eq(rsvpsTable.eventId, event.id),
        eq(rsvpsTable.userId, userId),
      ),
    });
    myRsvp = rsvp?.status ?? null;
  }

  const hasRsvp = myRsvp && myRsvp !== "cancelled";

  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: event.location ?? null,
    capacity: event.capacity ?? null,
    isOnline: event.isOnline,
    meetingUrl: hasRsvp ? (event.meetingUrl ?? null) : null,
    coverUrl: event.coverUrl ?? null,
    createdBy: event.createdBy,
    createdAt: event.createdAt,
    counts: {
      going: Number(goingRow?.count ?? 0),
      interested: Number(interestedRow?.count ?? 0),
    },
    myRsvp,
  };
}

// ── GET /events/upcoming (must be BEFORE /:slug) ──────────────────────────────
router.get("/events/upcoming", requireAuth, async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "5"), 20);
  const now = new Date();
  const events = await db.query.eventsTable.findMany({
    where: gt(eventsTable.startsAt, now),
    orderBy: [asc(eventsTable.startsAt)],
    limit,
  });
  const enriched = await Promise.all(
    events.map((e) => enrichEvent(e, req.userId)),
  );
  res.json(enriched);
});

// ── GET /events ───────────────────────────────────────────────────────────────
router.get("/events", requireAuth, async (req, res) => {
  const {
    status = "upcoming",
    mode,
    q,
    cursor,
    limit: limitRaw,
  } = req.query as Record<string, string>;
  const limit = Math.min(parseInt(limitRaw ?? "12") || 12, 60);
  const now = new Date();

  // Build conditions
  const conditions: Array<ReturnType<typeof eq>> = [];

  if (status === "upcoming") {
    conditions.push(gt(eventsTable.startsAt, now) as ReturnType<typeof eq>);
  } else if (status === "past") {
    conditions.push(lt(eventsTable.endsAt, now) as ReturnType<typeof eq>);
  }
  if (mode === "online") {
    conditions.push(eq(eventsTable.isOnline, true) as ReturnType<typeof eq>);
  } else if (mode === "in_person") {
    conditions.push(eq(eventsTable.isOnline, false) as ReturnType<typeof eq>);
  }
  if (q) {
    conditions.push(ilike(eventsTable.title, `%${q}%`) as ReturnType<typeof eq>);
  }

  // Cursor (keyset pagination)
  if (cursor) {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, "base64").toString(),
      ) as { startsAt: string; id: string };
      const cursorDate = new Date(decoded.startsAt);
      if (status === "upcoming") {
        conditions.push(
          or(
            gt(eventsTable.startsAt, cursorDate),
            and(eq(eventsTable.startsAt, cursorDate), gt(eventsTable.id, decoded.id)),
          ) as ReturnType<typeof eq>,
        );
      } else {
        conditions.push(
          or(
            lt(eventsTable.startsAt, cursorDate),
            and(eq(eventsTable.startsAt, cursorDate), lt(eventsTable.id, decoded.id)),
          ) as ReturnType<typeof eq>,
        );
      }
    } catch {
      // ignore malformed cursor
    }
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const orderBy =
    status === "upcoming"
      ? [asc(eventsTable.startsAt), asc(eventsTable.id)]
      : [desc(eventsTable.startsAt), desc(eventsTable.id)];

  const rows = await db.query.eventsTable.findMany({
    where,
    orderBy,
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  const nextCursor =
    hasMore && rows.length > 0
      ? Buffer.from(
          JSON.stringify({
            startsAt: rows[rows.length - 1].startsAt.toISOString(),
            id: rows[rows.length - 1].id,
          }),
        ).toString("base64")
      : null;

  const items = await Promise.all(rows.map((e) => enrichEvent(e, req.userId)));
  res.json({ items, nextCursor });
});

// ── GET /events/:slug ─────────────────────────────────────────────────────────
router.get("/events/:slug", requireAuth, async (req, res) => {
  const event = await db.query.eventsTable.findFirst({
    where: eq(eventsTable.slug, req.params.slug as string),
  });
  if (!event) {
    res.status(404).json({ error: "Evento no encontrado" });
    return;
  }
  res.json(await enrichEvent(event, req.userId));
});

// ── POST /events/:slug/rsvp ───────────────────────────────────────────────────
router.post("/events/:slug/rsvp", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { status } = req.body as { status: string };

  const event = await db.query.eventsTable.findFirst({
    where: eq(eventsTable.slug, req.params.slug as string),
  });
  if (!event) {
    res.status(404).json({ error: "Evento no encontrado" });
    return;
  }

  // Capacity check when changing to "going"
  if (status === "going" && event.capacity !== null) {
    const [goingRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rsvpsTable)
      .where(
        and(eq(rsvpsTable.eventId, event.id), eq(rsvpsTable.status, "going")),
      );
    const goingCount = Number(goingRow?.count ?? 0);
    const existing = await db.query.rsvpsTable.findFirst({
      where: and(eq(rsvpsTable.eventId, event.id), eq(rsvpsTable.userId, userId)),
    });
    if (existing?.status !== "going" && goingCount >= event.capacity) {
      res.status(409).json({ error: "event_full" });
      return;
    }
  }

  const existing = await db.query.rsvpsTable.findFirst({
    where: and(eq(rsvpsTable.eventId, event.id), eq(rsvpsTable.userId, userId)),
  });

  let rsvp;
  if (existing) {
    [rsvp] = await db
      .update(rsvpsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(rsvpsTable.id, existing.id))
      .returning();
  } else {
    [rsvp] = await db
      .insert(rsvpsTable)
      .values({ id: randomUUID(), eventId: event.id, userId, status })
      .returning();
  }

  // Notify event creator about new RSVP (skip if creator is RSVPing to own event)
  if (event.createdBy !== userId && status !== "none") {
    notify({
      recipientId: event.createdBy,
      type: "event_rsvp",
      title: "Nueva inscripción en tu evento",
      body: `Alguien se ha apuntado a "${event.title}" (${status === "going" ? "Asistirá" : "Interesado"})`,
      link: `/eventos/${event.slug}`,
    }).catch(() => {});
  }

  res.json(rsvp);
});

// ── Admin routes ─────────────────────────────────────────────────────────────

// GET /admin/events
router.get("/admin/events", requireAdmin, async (req, res) => {
  const events = await db.query.eventsTable.findMany({
    orderBy: [desc(eventsTable.startsAt)],
  });
  const enriched = await Promise.all(
    events.map((e) => enrichEvent(e, req.userId)),
  );
  res.json(enriched);
});

// POST /admin/events
router.post("/admin/events", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      startsAt,
      endsAt,
      location,
      capacity,
      isOnline,
      meetingUrl,
      coverUrl,
    } = req.body;

    if (!title || !startsAt || !endsAt) {
      res.status(400).json({ error: "title, startsAt y endsAt son requeridos" });
      return;
    }

    const slug = await uniqueSlug(title);

    const [event] = await db
      .insert(eventsTable)
      .values({
        id: randomUUID(),
        title,
        slug,
        description: description ?? "",
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        location: location ?? null,
        capacity: capacity != null ? Number(capacity) : null,
        isOnline: isOnline ?? false,
        meetingUrl: meetingUrl ?? null,
        coverUrl: coverUrl ?? null,
        createdBy: req.userId!,
      })
      .returning();

    res.status(201).json(await enrichEvent(event, req.userId));
  } catch (err) {
    req.log.error(err, "Failed to create event");
    res.status(500).json({ error: "Error al crear el evento" });
  }
});

// PATCH /admin/events/:slug
router.patch("/admin/events/:slug", requireAdmin, async (req, res) => {
  const event = await db.query.eventsTable.findFirst({
    where: eq(eventsTable.slug, req.params.slug as string),
  });
  if (!event) {
    res.status(404).json({ error: "Evento no encontrado" });
    return;
  }

  const {
    title,
    description,
    startsAt,
    endsAt,
    location,
    capacity,
    isOnline,
    meetingUrl,
    coverUrl,
  } = req.body;

  let slug = event.slug;
  if (title && title !== event.title) {
    slug = await uniqueSlug(title, event.id);
  }

  const [updated] = await db
    .update(eventsTable)
    .set({
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(startsAt !== undefined && { startsAt: new Date(startsAt) }),
      ...(endsAt !== undefined && { endsAt: new Date(endsAt) }),
      ...(location !== undefined && { location }),
      ...(capacity !== undefined && { capacity }),
      ...(isOnline !== undefined && { isOnline }),
      ...(meetingUrl !== undefined && { meetingUrl }),
      ...(coverUrl !== undefined && { coverUrl }),
      slug,
      updatedAt: new Date(),
    })
    .where(eq(eventsTable.id, event.id))
    .returning();

  res.json(await enrichEvent(updated, req.userId));
});

// DELETE /admin/events/:slug
router.delete("/admin/events/:slug", requireAdmin, async (req, res) => {
  const event = await db.query.eventsTable.findFirst({
    where: eq(eventsTable.slug, req.params.slug as string),
  });
  if (!event) {
    res.status(404).json({ error: "Evento no encontrado" });
    return;
  }
  await db.delete(eventsTable).where(eq(eventsTable.id, event.id));
  res.status(204).send();
});

// POST /admin/events/:slug/cover
router.post(
  "/admin/events/:slug/cover",
  requireAdmin,
  upload.single("cover"),
  async (req, res) => {
    const event = await db.query.eventsTable.findFirst({
      where: eq(eventsTable.slug, req.params.slug as string),
    });
    if (!event) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No se proporcionó imagen" });
      return;
    }

    const ext =
      file.mimetype === "image/png"
        ? "png"
        : file.mimetype === "image/webp"
          ? "webp"
          : "jpg";
    const subPath = `events/covers/${event.slug}/${randomUUID()}.${ext}`;

    await objectStorageService.uploadToPrivate(
      subPath,
      file.buffer,
      file.mimetype,
      { owner: req.userId!, visibility: "public" },
    );

    const coverUrl = `/api/storage/objects/${subPath}`;
    await db
      .update(eventsTable)
      .set({ coverUrl, updatedAt: new Date() })
      .where(eq(eventsTable.id, event.id));

    res.json({ coverUrl });
  },
);

export default router;
