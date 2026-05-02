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

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const claims = auth?.sessionClaims as ClerkClaims | null;
  const userId = claims?.userId as string | undefined || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
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
