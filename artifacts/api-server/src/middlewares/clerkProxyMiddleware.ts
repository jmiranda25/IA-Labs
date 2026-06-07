// Clerk proxy middleware removed — auth is now handled natively via JWT.
// This file is kept as a stub to avoid broken imports.
import type { RequestHandler } from "express";
import type { IncomingHttpHeaders } from "http";

export const CLERK_PROXY_PATH = "/api/__clerk";

export function getClerkProxyHost(req: {
  headers: IncomingHttpHeaders;
}): string | undefined {
  return undefined;
}

export function clerkProxyMiddleware(): RequestHandler {
  return (_req, _res, next) => next();
}
