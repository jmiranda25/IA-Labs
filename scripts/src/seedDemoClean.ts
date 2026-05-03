/**
 * Dependency-injectable implementation of the seed:demo:clean operation.
 * Keeping it separate from seedDemo.ts (which has top-level env-var guards
 * and live client initialisation) means it can be unit-tested without real
 * credentials.
 */

import { sql } from "drizzle-orm";
import { filterDemoUsers, assertCleanGuard, DEMO_DOMAIN } from "./cleanGuard.js";

export interface CleanEmailAddress {
  emailAddress: string;
}

export interface CleanUser {
  id: string;
  emailAddresses: CleanEmailAddress[];
}

export interface CleanDeps {
  clerk: {
    users: {
      getUserList(params: { limit: number }): Promise<{ data: CleanUser[] }>;
      deleteUser(id: string): Promise<unknown>;
    };
  };
  db: {
    execute(query: unknown): Promise<{ rowCount?: number | null }>;
  };
  pool: {
    end(): Promise<void>;
  };
}

export async function cleanWithDeps(deps: CleanDeps): Promise<void> {
  const { clerk, db, pool } = deps;

  console.log("\n🧹  Clean mode: removing all demo data…\n");

  const clerkUserList = await clerk.users.getUserList({ limit: 200 });
  const demoClerkUsers = filterDemoUsers(clerkUserList.data);

  assertCleanGuard(demoClerkUsers);

  const demoEmailPattern = "%" + DEMO_DOMAIN;

  console.log("  🗄  Deleting notifications for demo users…");
  const notifResult = await db.execute(sql`
    DELETE FROM notifications
    WHERE user_id IN (SELECT id FROM users WHERE email LIKE ${demoEmailPattern})
  `);
  console.log(`       ${notifResult.rowCount ?? 0} rows deleted`);

  console.log("  🗄  Deleting events (+ RSVPs cascade) created by demo users…");
  const eventResult = await db.execute(sql`
    DELETE FROM events
    WHERE created_by IN (SELECT id FROM users WHERE email LIKE ${demoEmailPattern})
  `);
  console.log(`       ${eventResult.rowCount ?? 0} rows deleted`);

  console.log("  🗄  Deleting RSVPs authored by demo users (for non-demo events)…");
  const rsvpResult = await db.execute(sql`
    DELETE FROM rsvps
    WHERE user_id IN (SELECT id FROM users WHERE email LIKE ${demoEmailPattern})
  `);
  console.log(`       ${rsvpResult.rowCount ?? 0} rows deleted`);

  console.log("  🗄  Deleting forum threads (+ posts + reactions cascade) by demo users…");
  const threadResult = await db.execute(sql`
    DELETE FROM forum_threads
    WHERE author_id IN (SELECT id FROM users WHERE email LIKE ${demoEmailPattern})
  `);
  console.log(`       ${threadResult.rowCount ?? 0} rows deleted`);

  console.log("  🗄  Deleting forum reactions/posts by demo users (in non-demo threads)…");
  await db.execute(sql`
    DELETE FROM forum_reactions
    WHERE user_id IN (SELECT id FROM users WHERE email LIKE ${demoEmailPattern})
  `);
  await db.execute(sql`
    DELETE FROM forum_posts
    WHERE author_id IN (SELECT id FROM users WHERE email LIKE ${demoEmailPattern})
  `);

  console.log("  🗄  Deleting marketplace listings (+ images + messages cascade) by demo users…");
  const listingResult = await db.execute(sql`
    DELETE FROM marketplace_listings
    WHERE seller_id IN (SELECT id FROM users WHERE email LIKE ${demoEmailPattern})
  `);
  console.log(`       ${listingResult.rowCount ?? 0} rows deleted`);

  console.log("  🗄  Deleting listing messages where demo user is sender or recipient…");
  await db.execute(sql`
    DELETE FROM listing_messages
    WHERE from_id IN (SELECT id FROM users WHERE email LIKE ${demoEmailPattern})
       OR to_id   IN (SELECT id FROM users WHERE email LIKE ${demoEmailPattern})
  `);

  console.log("  🗄  Deleting resources (+ tags cascade) by demo users…");
  const resourceResult = await db.execute(sql`
    DELETE FROM resources
    WHERE author_id IN (SELECT id FROM users WHERE email LIKE ${demoEmailPattern})
  `);
  console.log(`       ${resourceResult.rowCount ?? 0} rows deleted`);

  console.log("  🗄  Deleting DB user records…");
  const userResult = await db.execute(sql`
    DELETE FROM users WHERE email LIKE ${demoEmailPattern}
  `);
  console.log(`       ${userResult.rowCount ?? 0} rows deleted`);

  for (const u of demoClerkUsers) {
    const email = u.emailAddresses[0]?.emailAddress ?? "(no email)";
    console.log(`  🗑  Deleting Clerk user ${email} (${u.id})`);
    await clerk.users.deleteUser(u.id);
  }

  console.log(
    `\n✅  Deleted ${demoClerkUsers.length} Clerk users and ${userResult.rowCount ?? 0} DB users (all content removed in FK order).`
  );
  await pool.end();
}
