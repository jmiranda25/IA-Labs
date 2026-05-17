import { Router } from "express";
import { Webhook } from "svix";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { env } from "../env";

const router = Router();

const BOOTSTRAP_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

function generateUsername(base: string): string {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
  return cleaned || "member";
}

async function uniqueUsername(preferred: string): Promise<string> {
  let candidate = generateUsername(preferred);
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, candidate),
    columns: { username: true },
  });
  if (!existing) return candidate;
  const suffix = randomUUID().replace(/-/g, "").slice(0, 6);
  return `${candidate.slice(0, 14)}_${suffix}`;
}

router.post(
  "/webhooks/clerk",
  async (req, res) => {
    const webhookSecret = env.CLERK_WEBHOOK_SECRET;

    // req.body is a Buffer here because express.raw() is applied to this route
    // before express.json() in app.ts
    const rawBody = req.body as Buffer;

    if (webhookSecret) {
      const svixId = req.headers["svix-id"] as string | undefined;
      const svixTs = req.headers["svix-timestamp"] as string | undefined;
      const svixSig = req.headers["svix-signature"] as string | undefined;

      if (!svixId || !svixTs || !svixSig) {
        res.status(400).json({ error: "Missing svix headers" });
        return;
      }

      try {
        const wh = new Webhook(webhookSecret);
        // Use the raw Buffer — required for valid signature verification
        wh.verify(rawBody, {
          "svix-id": svixId,
          "svix-timestamp": svixTs,
          "svix-signature": svixSig,
        });
      } catch {
        res.status(400).json({ error: "Invalid webhook signature" });
        return;
      }
    }

    // Parse the JSON payload from the raw body
    let parsed: { type: string; data: {
      id: string;
      email_addresses?: Array<{ email_address: string; id: string }>;
      primary_email_address_id?: string;
      username?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      image_url?: string | null;
    } };

    try {
      parsed = JSON.parse(rawBody.toString("utf8"));
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }

    const { type, data } = parsed;

    if (type === "user.created") {
      const primaryEmail = data.email_addresses?.find(
        (e) => e.id === data.primary_email_address_id
      )?.email_address ?? data.email_addresses?.[0]?.email_address;

      const displayName =
        [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
        primaryEmail?.split("@")[0] ||
        "Member";

      const emailPrefix = primaryEmail?.split("@")[0] ?? "member";
      const username = await uniqueUsername(data.username || emailPrefix);

      const isBootstrapAdmin = !!primaryEmail && BOOTSTRAP_ADMIN_EMAILS.has(primaryEmail.toLowerCase());

      const existing = await db.query.usersTable.findFirst({
        where: eq(usersTable.clerkId, data.id),
        columns: { id: true },
      });

      if (!existing) {
        await db.insert(usersTable).values({
          id: randomUUID(),
          clerkId: data.id,
          email: primaryEmail ?? null,
          username,
          displayName,
          avatarUrl: data.image_url ?? null,
          role: isBootstrapAdmin ? "administrator" : "participant",
          status: isBootstrapAdmin ? "active" : "pending",
          skills: [],
        });
        req.log.info({ clerkId: data.id, email: primaryEmail, status: isBootstrapAdmin ? "active" : "pending" }, "Profile created via webhook");
      }
    }

    if (type === "user.updated") {
      const primaryEmail = data.email_addresses?.find(
        (e) => e.id === data.primary_email_address_id
      )?.email_address ?? data.email_addresses?.[0]?.email_address;

      const displayName =
        [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
        undefined;

      await db
        .update(usersTable)
        .set({
          ...(primaryEmail && { email: primaryEmail }),
          ...(displayName && { displayName }),
          ...(data.image_url !== undefined && { avatarUrl: data.image_url }),
          updatedAt: new Date(),
        })
        .where(eq(usersTable.clerkId, data.id));
    }

    res.json({ ok: true });
  }
);

export default router;
