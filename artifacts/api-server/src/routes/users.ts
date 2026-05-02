import { Router } from "express";
import { eq, ilike, or, sql, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getAuth } from "@clerk/express";
import { requireAuth } from "../lib/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { displayName, bio, avatarUrl, skills, location, website } = req.body;
  const [updated] = await db
    .update(usersTable)
    .set({
      ...(displayName && { displayName }),
      bio: bio ?? undefined,
      avatarUrl: avatarUrl ?? undefined,
      skills: skills ?? undefined,
      location: location ?? undefined,
      website: website ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.clerkId, clerkId))
    .returning();
  res.json(updated);
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
