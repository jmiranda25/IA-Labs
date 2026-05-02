/**
 * Seed an administrator account.
 *
 * Required env vars:
 *   CLERK_SECRET_KEY      — Clerk secret key (already in Replit secrets)
 *   SEED_ADMIN_EMAIL      — email for the admin account
 *   SEED_ADMIN_PASSWORD   — password for the admin account
 *   DATABASE_URL          — Postgres connection string (already in Replit secrets)
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run seed:admin
 */

import { createClerkClient } from "@clerk/backend";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY is required");
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!SEED_ADMIN_EMAIL) throw new Error("SEED_ADMIN_EMAIL is required");
if (!SEED_ADMIN_PASSWORD) throw new Error("SEED_ADMIN_PASSWORD is required");

const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").unique(),
  username: text("username").unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("participant"),
  skills: jsonb("skills").notNull().default([]),
  location: text("location"),
  website: text("website"),
  isBanned: boolean("is_banned").notNull().default(false),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

async function main() {
  console.log(`\n🔍  Looking up ${SEED_ADMIN_EMAIL} in Clerk…`);

  let clerkUserId: string;

  const existing = await clerkClient.users.getUserList({
    emailAddress: [SEED_ADMIN_EMAIL!],
    limit: 1,
  });

  if (existing.data.length > 0) {
    clerkUserId = existing.data[0].id;
    console.log(`✅  Found existing Clerk user: ${clerkUserId}`);
  } else {
    console.log("➕  Creating new Clerk user…");
    const created = await clerkClient.users.createUser({
      emailAddress: [SEED_ADMIN_EMAIL!],
      password: SEED_ADMIN_PASSWORD,
      skipPasswordChecks: false,
    });
    clerkUserId = created.id;
    console.log(`✅  Created Clerk user: ${clerkUserId}`);
  }

  console.log("🔑  Setting publicMetadata.role = \"administrator\"…");
  await clerkClient.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { role: "administrator" },
  });

  const username =
    SEED_ADMIN_EMAIL!.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase().slice(0, 20) + "_admin";

  console.log("💾  Upserting DB profile…");
  await db
    .insert(usersTable)
    .values({
      id: randomUUID(),
      clerkId: clerkUserId,
      email: SEED_ADMIN_EMAIL!,
      username,
      displayName: "Administrator",
      role: "administrator",
      skills: [],
    })
    .onConflictDoUpdate({
      target: usersTable.clerkId,
      set: {
        email: SEED_ADMIN_EMAIL!,
        role: "administrator",
        updatedAt: new Date(),
      },
    });

  console.log(`\n🎉  Admin seeded successfully!`);
  console.log(`    Email:    ${SEED_ADMIN_EMAIL}`);
  console.log(`    Clerk ID: ${clerkUserId}`);
  console.log(`    Role:     administrator\n`);

  await pool.end();
}

main().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
