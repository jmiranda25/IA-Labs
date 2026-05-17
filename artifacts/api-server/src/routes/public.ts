import { Router } from "express";
import { eq, and, count, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  rsvpsTable,
  forumThreadsTable,
  resourcesTable,
} from "@workspace/db";

const router = Router();

const CARD_COLS = {
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
  isPublic: true,
} as const;

// ── GET /public/users/:username ──────────────────────────────────────────────
router.get("/public/users/:username", async (req, res) => {
  const username = req.params.username as string;
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, username),
    columns: CARD_COLS,
  });

  if (!user || !user.isPublic) {
    res.status(404).json({ error: "Perfil no encontrado o privado" });
    return;
  }

  const { isPublic: _ip, ...card } = user;
  res.json(card);
});

// ── GET /public/users/:username/stats ────────────────────────────────────────
router.get("/public/users/:username/stats", async (req, res) => {
  const username = req.params.username as string;
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, username),
    columns: { id: true, joinedAt: true, isPublic: true },
  });

  if (!user || !user.isPublic) {
    res.status(404).json({ error: "Perfil no encontrado o privado" });
    return;
  }

  const [eventsResult, threadsResult, resourcesResult] = await Promise.all([
    db
      .select({ value: count() })
      .from(rsvpsTable)
      .where(and(eq(rsvpsTable.userId, user.id), eq(rsvpsTable.status, "going"))),
    db
      .select({ value: count() })
      .from(forumThreadsTable)
      .where(eq(forumThreadsTable.authorId, user.id)),
    db
      .select({ value: count() })
      .from(resourcesTable)
      .where(and(eq(resourcesTable.authorId, user.id), eq(resourcesTable.published, true))),
  ]);

  res.json({
    eventsAttended: Number(eventsResult[0]?.value ?? 0),
    threadsCreated: Number(threadsResult[0]?.value ?? 0),
    resourcesShared: Number(resourcesResult[0]?.value ?? 0),
    memberSince: user.joinedAt.toISOString(),
  });
});

// ── GET /public/promote-bootstrap ────────────────────────────────────────────
// Temporary one-shot endpoint: promotes all ADMIN_BOOTSTRAP_EMAILS users to
// administrator without requiring Clerk auth. Disabled once BOOTSTRAP_DONE=true.
router.get("/public/promote-bootstrap", async (req, res) => {
  if (process.env.BOOTSTRAP_DONE === "true") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const bootstrapEmails = (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (bootstrapEmails.length === 0) {
    res.status(400).json({ error: "ADMIN_BOOTSTRAP_EMAILS is not configured" });
    return;
  }

  const promoted = await db
    .update(usersTable)
    .set({ role: "administrator" })
    .where(inArray(usersTable.email, bootstrapEmails))
    .returning({
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role,
    });

  res.json({
    promoted,
    bootstrapEmails,
    note: "Set BOOTSTRAP_DONE=true env var to disable this endpoint.",
  });
});

export default router;
