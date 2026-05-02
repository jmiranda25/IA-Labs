import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, reportsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";
import { randomUUID } from "crypto";

const router = Router();

// POST /reports — any authenticated user can file a report
router.post("/reports", requireAuth, async (req, res) => {
  const { target_type, target_id, reason } = req.body as {
    target_type: string;
    target_id: string;
    reason: string;
  };

  if (!target_type || !target_id || !reason?.trim()) {
    res.status(400).json({ error: "target_type, target_id and reason are required" });
    return;
  }

  const validTargetTypes = ["forum_post", "forum_thread", "listing"];
  if (!validTargetTypes.includes(target_type)) {
    res.status(400).json({ error: "Invalid target_type" });
    return;
  }

  // Look up reporter's internal id
  const reporter = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, req.userId!),
    columns: { id: true },
  });

  if (!reporter) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [report] = await db
    .insert(reportsTable)
    .values({
      id: randomUUID(),
      targetType: target_type,
      targetId: target_id,
      reporterId: reporter.id,
      reason: reason.trim(),
      status: "open",
    })
    .returning();

  res.status(201).json(report);
});

export default router;
