import { Router } from "express";
import { eq, ilike, or, sql, and, ne } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getAuth } from "@clerk/express";
import { requireAuth } from "../lib/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { randomUUID } from "crypto";
import multer from "multer";

const router = Router();
const objectStorageService = new ObjectStorageService();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

// GET /users/me
router.get("/users/me", requireAuth, async (req, res) => {
  const clerkId = req.userId!;
  let user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    const auth = getAuth(req);
    const claims = auth?.sessionClaims as Record<string, unknown> | null;
    const name =
      (claims?.name as string) ||
      (claims?.email as string)?.split("@")[0] ||
      "Member";
    const avatar = (claims?.picture as string) || null;
    [user] = await db
      .insert(usersTable)
      .values({
        id: randomUUID(),
        clerkId,
        displayName: name,
        avatarUrl: avatar,
        role: "participant",
        skills: [],
      })
      .returning();
  }
  res.json(user);
});

// PUT /users/me  — role field is intentionally excluded; only admins may change roles
router.put("/users/me", requireAuth, async (req, res) => {
  const clerkId = req.userId!;
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
      .where(eq(usersTable.clerkId, clerkId))
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

// POST /users/me/avatar
router.post("/users/me/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  const clerkId = req.userId!;
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No se proporcionó archivo" });
    return;
  }

  const ext = file.mimetype === "image/png" ? "png" : file.mimetype === "image/webp" ? "webp" : "jpg";
  const uuid = randomUUID();
  const subPath = `avatars/${clerkId}/${uuid}.${ext}`;

  try {
    await objectStorageService.uploadToPrivate(subPath, file.buffer, file.mimetype, {
      owner: clerkId,
      visibility: "public",
    });
  } catch (err: any) {
    req.log.error({ err }, "Error uploading avatar");
    res.status(500).json({ error: "Error al subir el avatar" });
    return;
  }

  const avatarUrl = `/api/storage/objects/${subPath}`;

  await db
    .update(usersTable)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(usersTable.clerkId, clerkId));

  res.json({ avatarUrl });
});

// GET /users/check-username
router.get("/users/check-username", requireAuth, async (req, res) => {
  const clerkId = req.userId!;
  const value = req.query.value as string;

  if (!value || !USERNAME_RE.test(value)) {
    res.status(400).json({ error: "Nombre de usuario no válido" });
    return;
  }

  const existing = await db.query.usersTable.findFirst({
    where: and(eq(usersTable.username, value), ne(usersTable.clerkId, clerkId)),
  });

  res.json({ available: !existing });
});

// GET /users
router.get("/users", requireAuth, async (req, res) => {
  const { search, role, limit = "24", offset = "0" } = req.query as Record<string, string>;
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(usersTable.displayName, `%${search}%`),
        ilike(usersTable.bio, `%${search}%`),
        ilike(usersTable.location, `%${search}%`)
      )
    );
  }
  if (role) conditions.push(eq(usersTable.role, role));
  const where = conditions.length ? and(...conditions) : undefined;
  const users = await db.query.usersTable.findMany({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(usersTable)
    .where(where);
  res.json({ users, total: Number(total[0]?.count ?? 0) });
});

// GET /users/:userId
router.get("/users/:userId", requireAuth, async (req, res) => {
  const userId = req.params.userId as string;
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, userId),
  });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(user);
});

export default router;
