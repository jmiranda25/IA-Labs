import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import {
  clearTokens,
  getAccessToken,
  getValidAccessToken,
  setTokens,
} from "@/lib/auth";
import { apiUrl } from "@/lib/api-base";

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  username: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

type Props = { children: React.ReactNode };

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = user !== null;

  const getToken = useCallback(async (): Promise<string | null> => {
    return getValidAccessToken();
  }, []);

  // Register our token getter with the generated API client so all hooks
  // automatically include the Authorization header.
  useEffect(() => {
    setAuthTokenGetter(getToken);
    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken]);

  // Restore session from in-memory tokens on mount (no-op if page was refreshed)
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    // We have an access token in memory — fetch the current user to hydrate state
    getValidAccessToken()
      .then((validToken) => {
        if (!validToken) {
          setIsLoading(false);
          return;
        }
        return fetch(apiUrl("/api/users/me"), {
          headers: { Authorization: `Bearer ${validToken}` },
        }).then(async (res) => {
          if (res.ok) {
            const data = (await res.json()) as AuthUser;
            setUser(data);
          } else {
            clearTokens();
          }
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? "Error al iniciar sesión");
    }

    const data = (await res.json()) as {
      user: AuthUser;
      accessToken: string;
      refreshToken: string;
    };

    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Error al registrarse");
      }

      const data = (await res.json()) as {
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
      };

      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const token = getAccessToken();
      await fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
    } catch {
      // non-fatal
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated, login, register, logout, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}
