import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      isAdmin?: boolean;
    }
  }
}

type ClerkClaims = {
  userId?: string;
  publicMetadata?: { role?: string };
  [key: string]: unknown;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const claims = auth?.sessionClaims as ClerkClaims | null;
  const userId = claims?.userId as string | undefined || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;

  // Check account status — only applies to users who already have a row.
  // Brand-new users (no row yet) are allowed through so GET /users/me can create their row.
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, userId),
    columns: { status: true },
  });

  if (user?.status === "pending") {
    res.status(403).json({ error: "Account pending approval", code: "PENDING_APPROVAL" });
    return;
  }
  if (user?.status === "rejected") {
    res.status(403).json({ error: "Account not approved", code: "ACCOUNT_REJECTED" });
    return;
  }

  next();
}

/**
 * Factory that produces a middleware requiring a specific role.
 * Checks JWT publicMetadata first; falls back to DB for stale sessions.
 */
export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    const claims = auth?.sessionClaims as ClerkClaims | null;
    const userId = claims?.userId as string | undefined || auth?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = userId;

    const jwtRole = claims?.publicMetadata?.role;
    if (jwtRole === role) {
      next();
      return;
    }

    // Fallback: DB check for stale JWTs or missing JWT template
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, userId),
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
  const auth = getAuth(req);
  const claims = auth?.sessionClaims as ClerkClaims | null;
  const userId = claims?.userId as string | undefined || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;

  // Fast path: JWT already has the role
  const jwtRole = claims?.publicMetadata?.role;
  if (jwtRole === "administrator") {
    req.isAdmin = true;
    next();
    return;
  }

  // Fallback: DB check for stale JWTs or missing Clerk JWT template
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, userId),
    columns: { role: true },
  });
  if (user?.role !== "administrator") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  req.isAdmin = true;
  next();
}
