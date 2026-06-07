import { verifyAccessToken } from "@workspace/auth";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: string;   // Internal users.id UUID
      userDbId?: string; // Alias for userId — kept for call-site compatibility
      userRole?: string;
      isAdmin?: boolean;
    }
  }
}

const BOOTSTRAP_ADMIN_EMAILS = new Set(
  (process.env.ADMIN_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let payload: { userId: string; email: string; role: string };
  try {
    payload = verifyAccessToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.userId = payload.userId;
  req.userDbId = payload.userId;
  req.userRole = payload.role;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, payload.userId),
    columns: { id: true, status: true, email: true },
  });

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  // Bootstrap admin self-healing: always keep configured admins active
  if (user.status === "pending" || user.status === "rejected") {
    const email = user.email?.toLowerCase() ?? null;
    if (email && BOOTSTRAP_ADMIN_EMAILS.has(email)) {
      await db
        .update(usersTable)
        .set({ status: "active", role: "administrator", updatedAt: new Date() })
        .where(eq(usersTable.id, payload.userId));
      next();
      return;
    }
  }

  if (user.status === "pending") {
    res.status(403).json({ error: "Account pending approval", code: "PENDING_APPROVAL" });
    return;
  }
  if (user.status === "rejected") {
    res.status(403).json({ error: "Account not approved", code: "ACCOUNT_REJECTED" });
    return;
  }

  next();
}

/**
 * Factory that produces a middleware requiring a specific role.
 * Checks JWT role claim first; falls back to DB for stale tokens.
 */
export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let payload: { userId: string; email: string; role: string };
    try {
      payload = verifyAccessToken(token);
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.userId = payload.userId;
    req.userDbId = payload.userId;
    req.userRole = payload.role;

    if (payload.role === role) {
      next();
      return;
    }

    // Fallback: DB check for tokens issued before a role change
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, payload.userId),
      columns: { role: true },
    });
    if (user?.role !== role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let payload: { userId: string; email: string; role: string };
  try {
    payload = verifyAccessToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.userId = payload.userId;
  req.userDbId = payload.userId;

  if (payload.role === "administrator") {
    req.isAdmin = true;
    next();
    return;
  }

  // Fallback: DB check for stale tokens
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, payload.userId),
    columns: { id: true, role: true },
  });
  if (user?.role !== "administrator") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  req.isAdmin = true;
  next();
}
