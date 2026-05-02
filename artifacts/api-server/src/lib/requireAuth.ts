import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
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
 * Useful when a single route needs a role check beyond basic auth.
 * Example: router.post("/events", requireRole("administrator"), handler)
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = getAuth(req);
    const claims = auth?.sessionClaims as ClerkClaims | null;
    const userId = claims?.userId as string | undefined || auth?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.userId = userId;
    const userRole = claims?.publicMetadata?.role;
    if (userRole !== role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const claims = auth?.sessionClaims as ClerkClaims | null;
  const userId = claims?.userId as string | undefined || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  const role = claims?.publicMetadata?.role;
  if (role !== "administrator") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
