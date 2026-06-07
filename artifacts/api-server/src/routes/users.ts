import { Router } from "express";
import { eq, ilike, or, sql, and, ne, lt, desc } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";
import { sendEmail } from "../lib/sendEmail";
import { ObjectStorageService } from "../lib/objectStorage";
import { randomUUID } from "crypto";
import multer from "multer";
import { z } from "zod/v4";

const NOTIF_PREF_KEYS = ["forum_reply", "event_rsvp", "marketplace_message", "admin_action", "resource_status", "listing_status"] as const;

const DEFAULT_NOTIF_PREFS = {
  forum_reply: true,
  event_rsvp: true,
  marketplace_message: true,
  admin_action: true,
  resource_status: true,
  listing_status: true,
};

const notifPrefsSchema = z.object({
  forum_reply: z.boolean(),
  event_rsvp: z.boolean(),
  marketplace_message: z.boolean(),
  admin_action: z.boolean(),
  resource_status: z.boolean(),
  listing_status: z.boolean(),
});

const router = Router();
const objectStorageService = new ObjectStorageService();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

// Safe columns for the public directory — never include email / passwordHash / isBanned
const PUBLIC_COLS = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  role: true,
  location: true,
  website: true,
  skills: true,
  joinedAt: true,
} as const;

// Emails that always receive the administrator role.
const BOOTSTRAP_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

// ── GET /users/me ────────────────────────────────────────────────────────────
router.get("/users/me", requireAuth, async (req, res) => {
  const userId = req.userId!;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  // Bootstrap admin self-heal on every request
  const storedEmail = user.email?.toLowerCase() ?? null;
  if (storedEmail && BOOTSTRAP_ADMIN_EMAILS.has(storedEmail) &&
      (user.role !== "administrator" || user.status !== "active")) {
    const [updated] = await db
      .update(usersTable)
      .set({ role: "administrator", status: "active", updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning();
    res.json(updated);
    return;
  }

  res.json(user);
});

// ── PUT /users/me ─────────────────────────────────────────────────────────────
router.put("/users/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { displayName, bio, avatarUrl, skills, location, website, username } = req.body;

  if (username !== undefined && username !== null && username !== "") {
    if (!USERNAME_RE.test(username)) {
      res.status(400).json({ error: "Nombre de usuario no válido. Solo letras minúsculas, números y guiones bajos (3–24 caracteres)." });
      return;
    }
  }

  try {
    const [updated] = await db
      .update(usersTable)
      .set({
        ...(displayName && { displayName }),
        bio: bio ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
        skills: skills ?? undefined,
        location: location ?? undefined,
        website: website ?? undefined,
        ...(username ? { username } : {}),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId))
      .returning();
    res.json(updated);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "El nombre de usuario ya está en uso" });
      return;
    }
    throw err;
  }
});

// ── GET /users/me/notification-preferences ───────────────────────────────────
router.get("/users/me/notification-preferences", requireAuth, async (req, res) => {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, req.userId!),
    columns: { notificationPreferences: true },
  });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...DEFAULT_NOTIF_PREFS, ...(user.notificationPreferences as object ?? {}) });
});

// ── PUT /users/me/notification-preferences ────────────────────────────────────
router.put("/users/me/notification-preferences", requireAuth, async (req, res) => {
  const parsed = notifPrefsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Preferencias no válidas" }); return; }
  const [updated] = await db
    .update(usersTable)
    .set({ notificationPreferences: parsed.data, updatedAt: new Date() })
    .where(eq(usersTable.id, req.userId!))
    .returning();
  res.json({ ...DEFAULT_NOTIF_PREFS, ...(updated.notificationPreferences as object ?? {}) });
});

// ── POST /users/me/avatar ─────────────────────────────────────────────────────
router.post("/users/me/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  const userId = req.userId!;
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No se proporcionó archivo" });
    return;
  }

  const ext = file.mimetype === "image/png" ? "png" : file.mimetype === "image/webp" ? "webp" : "jpg";
  const uuid = randomUUID();
  const subPath = `avatars/${userId}/${uuid}.${ext}`;

  try {
    await objectStorageService.uploadToPrivate(subPath, file.buffer, file.mimetype, {
      owner: userId,
      visibility: "public",
    });
  } catch (err: any) {
    req.log.error({ err }, "Error uploading avatar");
    res.status(500).json({ error: "Error al subir el avatar" });
    return;
  }

  const avatarUrl = `/api/storage/objects/${subPath}`;
  await db.update(usersTable).set({ avatarUrl, updatedAt: new Date() }).where(eq(usersTable.id, userId));
  res.json({ avatarUrl });
});

// ── GET /users/check-username ─────────────────────────────────────────────────
router.get("/users/check-username", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const value = req.query.value as string;

  if (!value || !USERNAME_RE.test(value)) {
    res.status(400).json({ error: "Nombre de usuario no válido" });
    return;
  }

  const existing = await db.query.usersTable.findFirst({
    where: and(eq(usersTable.username, value), ne(usersTable.id, userId)),
  });

  res.json({ available: !existing });
});

// ── GET /users/by-username/:username ──────────────────────────────────────────
router.get("/users/by-username/:username", requireAuth, async (req, res) => {
  const username = req.params.username as string;
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, username),
    columns: PUBLIC_COLS,
  });
  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }
  res.json(user);
});

// ── GET /users (cursor-paginated public directory) ────────────────────────────
router.get("/users", requireAuth, async (req, res) => {
  const { q, role, cursor, limit: limitRaw } = req.query as Record<string, string>;
  const limit = Math.min(parseInt(limitRaw ?? "24") || 24, 60);

  const conditions: ReturnType<typeof eq>[] = [];

  if (q) {
    conditions.push(
      or(
        ilike(usersTable.displayName, `%${q}%`),
        ilike(usersTable.username, `%${q}%`),
      ) as ReturnType<typeof eq>
    );
  }

  if (role) {
    conditions.push(eq(usersTable.role, role) as ReturnType<typeof eq>);
  }

  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, "base64").toString()) as {
        joinedAt: string;
        id: string;
      };
      const cursorDate = new Date(decoded.joinedAt);
      conditions.push(
        or(
          lt(usersTable.joinedAt, cursorDate),
          and(eq(usersTable.joinedAt, cursorDate), lt(usersTable.id, decoded.id)),
        ) as ReturnType<typeof eq>
      );
    } catch {
      // ignore malformed cursor
    }
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db.query.usersTable.findMany({
    where,
    columns: PUBLIC_COLS,
    orderBy: [desc(usersTable.joinedAt), desc(usersTable.id)],
    limit: limit + 1,
  });

  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  const nextCursor =
    hasMore && rows.length > 0
      ? Buffer.from(
          JSON.stringify({
            joinedAt: rows[rows.length - 1].joinedAt.toISOString(),
            id: rows[rows.length - 1].id,
          }),
        ).toString("base64")
      : null;

  res.json({ items: rows, nextCursor });
});

// ── PATCH /users/me/card-visibility ──────────────────────────────────────────
router.patch("/users/me/card-visibility", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { isPublic } = req.body;
  if (typeof isPublic !== "boolean") {
    res.status(400).json({ error: "isPublic must be a boolean" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ isPublic, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning({ isPublic: usersTable.isPublic });
  res.json({ isPublic: updated.isPublic });
});

// ── GET /users/:userId (legacy — keep for backward compat) ───────────────────
router.get("/users/:userId", requireAuth, async (req, res) => {
  const userId = req.params.userId as string;
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(user);
});

export default router;
