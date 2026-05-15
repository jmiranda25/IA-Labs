import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID, randomBytes } from "crypto";
import { db, usersTable, referralLinksTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/requireAuth";

const router = Router();

function generateCode(): string {
  return randomBytes(6).toString("base64url").slice(0, 8);
}

async function validateCode(code: string) {
  const link = await db.query.referralLinksTable.findFirst({
    where: eq(referralLinksTable.code, code),
  });
  if (!link || !link.isActive) return { error: "invalid", status: 404 };
  if (link.expiresAt && link.expiresAt < new Date()) return { error: "expired", status: 410 };
  if (link.maxUses != null && link.usesCount >= link.maxUses) return { error: "limit_reached", status: 410 };
  return { link };
}

// ── Admin ─────────────────────────────────────────────────────────────────────

router.get("/admin/referrals", requireAdmin, async (req, res) => {
  const links = await db
    .select({
      id: referralLinksTable.id,
      code: referralLinksTable.code,
      label: referralLinksTable.label,
      usesCount: referralLinksTable.usesCount,
      maxUses: referralLinksTable.maxUses,
      expiresAt: referralLinksTable.expiresAt,
      isActive: referralLinksTable.isActive,
      createdAt: referralLinksTable.createdAt,
      createdByUsername: usersTable.username,
      createdByName: usersTable.displayName,
    })
    .from(referralLinksTable)
    .leftJoin(usersTable, eq(referralLinksTable.createdBy, usersTable.id))
    .orderBy(desc(referralLinksTable.createdAt));
  res.json(links);
});

router.post("/admin/referrals", requireAdmin, async (req, res) => {
  const { label, maxUses, expiresAt } = (req.body ?? {}) as {
    label?: string;
    maxUses?: number;
    expiresAt?: string;
  };

  const admin = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, req.userId!),
    columns: { id: true },
  });
  if (!admin) { res.status(404).json({ error: "User not found" }); return; }

  let code = generateCode();
  for (let i = 0; i < 10; i++) {
    const existing = await db.query.referralLinksTable.findFirst({
      where: eq(referralLinksTable.code, code),
      columns: { id: true },
    });
    if (!existing) break;
    code = generateCode();
  }

  const [link] = await db
    .insert(referralLinksTable)
    .values({
      id: randomUUID(),
      code,
      label: label?.trim() || null,
      createdBy: admin.id,
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  res.status(201).json(link);
});

router.patch("/admin/referrals/:code", requireAdmin, async (req, res) => {
  const code = String(req.params["code"]);
  const { label, isActive, maxUses } = (req.body ?? {}) as {
    label?: string;
    isActive?: boolean;
    maxUses?: number | null;
  };

  type UpdateSet = Partial<{
    label: string | null;
    isActive: boolean;
    maxUses: number | null;
  }>;
  const updates: UpdateSet = {};
  if (label !== undefined) updates.label = label?.trim() || null;
  if (isActive !== undefined) updates.isActive = Boolean(isActive);
  if (maxUses !== undefined) updates.maxUses = maxUses != null ? Number(maxUses) : null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(referralLinksTable)
    .set(updates)
    .where(eq(referralLinksTable.code, code))
    .returning();

  if (!updated) { res.status(404).json({ error: "Link not found" }); return; }
  res.json(updated);
});

router.delete("/admin/referrals/:code", requireAdmin, async (req, res) => {
  const code = String(req.params["code"]);
  const [deleted] = await db
    .delete(referralLinksTable)
    .where(eq(referralLinksTable.code, code))
    .returning({ id: referralLinksTable.id });

  if (!deleted) { res.status(404).json({ error: "Link not found" }); return; }
  res.status(204).send();
});

// ── Public validation ──────────────────────────────────────────────────────────

router.get("/referrals/:code", async (req, res) => {
  const result = await validateCode(String(req.params["code"]));
  if (result.error) {
    res.status(result.status!).json({ error: result.error });
    return;
  }
  res.json({ valid: true, code: result.link!.code, label: result.link!.label });
});

// ── Authenticated redemption ───────────────────────────────────────────────────

router.post("/referrals/use", requireAuth, async (req, res) => {
  const { code } = (req.body ?? {}) as { code?: string };
  if (!code) { res.status(400).json({ error: "Code required" }); return; }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, req.userId!),
    columns: { id: true, referredBy: true },
  });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (user.referredBy) {
    res.json({ ok: true, alreadyReferred: true });
    return;
  }

  const result = await validateCode(code);
  if (result.error) {
    res.status(result.status!).json({ error: result.error });
    return;
  }
  const link = result.link!;

  if (link.createdBy === user.id) {
    res.status(400).json({ error: "Cannot use your own referral link" });
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ referredBy: code })
      .where(eq(usersTable.clerkId, req.userId!));
    await tx
      .update(referralLinksTable)
      .set({ usesCount: sql`${referralLinksTable.usesCount} + 1` })
      .where(eq(referralLinksTable.code, code));
  });

  res.json({ ok: true });
});

export default router;
