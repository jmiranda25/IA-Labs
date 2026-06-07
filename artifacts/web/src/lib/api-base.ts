/** Returns the API base URL without trailing slash, or empty string for same-origin calls. */
export function getApiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
}

/** Resolves a relative /api path to an absolute URL when VITE_API_URL is set. */
export function apiUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path}` : path;
}
