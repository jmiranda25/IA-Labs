import { useEffect, useRef } from "react";
import { Redirect, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * StatusGate — guards routes behind account-status checks.
 *
 * Always fetches a FRESH /api/users/me on every mount so a freshly-approved
 * account is never held back by a cached "pending" response.
 */
function StatusGate({ children }: ProtectedRouteProps) {
  const { data: me, isLoading, isFetching, error } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: "always",
    },
  });

  if (isLoading) return null;

  // A stale error is in cache but a fresh re-fetch is already in flight — wait
  // so we don't redirect an admin who was just approved.
  if (error && isFetching) return null;

  const errorCode =
    (error as any)?.response?.data?.code ?? (error as any)?.data?.code;
  if (errorCode === "PENDING_APPROVAL") return <Redirect to="/pendiente" />;
  if (errorCode === "ACCOUNT_REJECTED") return <Redirect to="/rechazado" />;

  const status = (me as any)?.status;
  if (status === "pending") return <Redirect to="/pendiente" />;
  if (status === "rejected") return <Redirect to="/rechazado" />;

  return <>{children}</>;
}

/**
 * Gate a route behind authentication + account status check.
 * – Signed out         → redirect to /iniciar-sesion
 * – Pending approval   → redirect to /pendiente
 * – Rejected           → redirect to /rechazado
 * – Active + signed in → renders children
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Redirect to="/iniciar-sesion" />;
  }

  return <StatusGate>{children}</StatusGate>;
}

/**
 * Gate a route behind the "administrator" role.
 * – Admin      → renders children.
 * – Participant → shows "Acceso restringido" toast and redirects to /dashboard.
 * – Loading    → renders nothing (avoids flash).
 *
 * Must be used inside ProtectedRoute.
 */
export function RequireAdmin({ children }: ProtectedRouteProps) {
  const { data: me, isLoading } = useGetMe();
  const [, setLocation] = useLocation();
  const firedRef = useRef(false);

  const isAdmin = (me as any)?.role === "administrator";

  useEffect(() => {
    if (isLoading || isAdmin || firedRef.current) return;
    if (me !== undefined) {
      firedRef.current = true;
      toast.error("Acceso restringido", {
        description: "No tienes permisos para acceder a esta sección.",
      });
      setLocation("/dashboard");
    }
  }, [me, isLoading, isAdmin, setLocation]);

  if (isLoading) return null;
  if (!isAdmin) return null;

  return <>{children}</>;
}
