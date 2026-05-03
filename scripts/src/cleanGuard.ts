/**
 * Guard and filter helpers for the seed:demo:clean operation.
 * Extracted so they can be unit-tested without importing seedDemo.ts,
 * which requires live env vars (CLERK_SECRET_KEY, DATABASE_URL).
 */

export const DEMO_DOMAIN = "@aicomunidad.dev";
export const GUARD_EMAIL = "mayckolco@gmail.com";

export type ClerkEmailAddress = { emailAddress: string };
export type ClerkUserLike = { emailAddresses: ClerkEmailAddress[] };

/**
 * Filter a raw Clerk user list down to demo accounts only
 * (those whose email ends with DEMO_DOMAIN).
 */
export function filterDemoUsers<T extends ClerkUserLike>(users: T[]): T[] {
  return users.filter((u) =>
    u.emailAddresses.some((e) => e.emailAddress.endsWith(DEMO_DOMAIN))
  );
}

/**
 * Throw if the protected guard email is present in the demo user list.
 * This is a hard-stop safety check — if it triggers something is wrong
 * and no data should be deleted.
 */
export function assertCleanGuard(demoUsers: ClerkUserLike[]): void {
  for (const u of demoUsers) {
    for (const ea of u.emailAddresses) {
      if (ea.emailAddress === GUARD_EMAIL) {
        throw new Error(
          `Guard triggered: ${GUARD_EMAIL} must not be deleted!`
        );
      }
    }
  }
}
