/**
 * JWT token management — in-memory storage only.
 *
 * Access token lives in a JS variable (not localStorage) to prevent XSS theft.
 * Refresh token is stored in memory as well; on a full page reload the user
 * must log in again. For persistent sessions, consider an httpOnly cookie
 * approach on the backend.
 */
import { apiUrl } from "./api-base";

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function getRefreshToken(): string | null {
  return _refreshToken;
}

export function setTokens(accessToken: string, refreshToken: string): void {
  _accessToken = accessToken;
  _refreshToken = refreshToken;
}

export function clearTokens(): void {
  _accessToken = null;
  _refreshToken = null;
  _refreshPromise = null;
}

/** Decode the expiry timestamp (seconds) from a JWT without verifying the signature. */
function getTokenExpiry(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

function isTokenExpiredOrExpiringSoon(token: string, bufferSeconds = 30): boolean {
  const exp = getTokenExpiry(token);
  if (!exp) return true;
  return Date.now() / 1000 >= exp - bufferSeconds;
}

/**
 * Returns a valid access token, refreshing it if it's expired or about to expire.
 * Multiple concurrent callers share a single in-flight refresh request.
 */
export async function getValidAccessToken(): Promise<string | null> {
  if (_accessToken && !isTokenExpiredOrExpiringSoon(_accessToken)) {
    return _accessToken;
  }

  if (!_refreshToken) return null;

  // Deduplicate concurrent refresh calls
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const res = await fetch(apiUrl("/api/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: _refreshToken }),
      });

      if (!res.ok) {
        clearTokens();
        return null;
      }

      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
      };
      setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      clearTokens();
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}
