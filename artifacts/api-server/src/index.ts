import "./env"; // validate env vars at startup — throws loudly if anything is missing
import app from "./app";
import { logger } from "./lib/logger";
import { db, pool, usersTable } from "@workspace/db";
import { and, eq, notInArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Downgrade any non-bootstrap accounts that were incorrectly seeded as
// administrator. Safe to run on every start — it is a no-op when there are
// no rows to fix.
async function fixSeedAdminRoles() {
  const bootstrapEmails = (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (bootstrapEmails.length === 0) return;

  const fixed = await db
    .update(usersTable)
    .set({ role: "participant", updatedAt: new Date() })
    .where(
      and(
        eq(usersTable.role, "administrator"),
        notInArray(usersTable.email, bootstrapEmails),
      ),
    )
    .returning({ email: usersTable.email });

  if (fixed.length > 0) {
    logger.info({ emails: fixed.map((r) => r.email) }, "Downgraded seed admin roles to participant");
  }
}

async function start() {
  // __dirname = /app/artifacts/api-server/dist at runtime (esbuild output)
  // 3 levels up reaches /app/, then lib/db/migrations
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = path.resolve(__dirname, "../../../lib/db/migrations");

  logger.info({ migrationsFolder }, "Running migrations");
  await migrate(db, { migrationsFolder });
  logger.info("Migrations applied successfully");

  try {
    await fixSeedAdminRoles();
  } catch (err) {
    logger.warn({ err }, "fixSeedAdminRoles failed — skipping, server will still start");
    console.warn("fixSeedAdminRoles error:", (err as Error)?.message ?? err);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

start().catch((err) => {
  logger.error({ err }, "Startup failed");
  console.error("STARTUP ERROR:", err?.message ?? err);
  process.exit(1);
});
