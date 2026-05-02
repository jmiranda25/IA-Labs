import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

/**
 * Returns true if the given Clerk user ID belongs to an administrator.
 * Use this for programmatic checks outside of Express middleware.
 */
export async function isAdmin(clerkId: string): Promise<boolean> {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
    columns: { role: true },
  });
  return user?.role === "administrator";
}
