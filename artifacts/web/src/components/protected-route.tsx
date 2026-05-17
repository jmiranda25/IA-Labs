import { useEffect, useRef } from "react";
import { Show } from "@clerk/react";
import { Redirect, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * StatusGate — called inside Clerk's "signed-in" guard.
 *
 * Always fetches a FRESH /api/users/me on every mount (staleTime: 0,
 * refetchOnMount: "always", gcTime: 0).  This prevents a stale cached 403
 * from a previous "pending" state from incorrectly redirecting an admin whose
 * account has since been approved.
 *
 * The redirect is intentionally deferred while a re-fetch is in progress so
 * that we only act on settled, server-confirmed data:
 *   - isLoading      → no cache at all yet, wait
 *   - error + isFetching → stale error still alive but re-fetch underway, wait
 *   - error + !isFetching → confirmed fresh error → redirect
 *   - data           → confirmed fresh data   → check status
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

  // Initial load (no data or error in cache yet)
  if (isLoading) return null;

  // Stale error in cache but a fresh re-fetch is already in flight — wait
  // before acting so we don't redirect an admin who was just approved.
  if (error && isFetching) return null;

  // Confirmed fresh error from requireAuth middleware
  const errorCode =
    (error as any)?.response?.data?.code ?? (error as any)?.data?.code;
  if (errorCode === "PENDING_APPROVAL") return <Redirect to="/pendiente" />;
  if (errorCode === "ACCOUNT_REJECTED") return <Redirect to="/rechazado" />;

  // Confirmed fresh 200 — check the status field (handles first-ever login)
  const status = (me as any)?.status;
  if (status === "pending") return <Redirect to="/pendiente" />;
  if (status === "rejected") return <Redirect to="/rechazado" />;

  return <>{children}</>;
}

/**
 * Gate a route behind Clerk authentication + account status check.
 * – Signed out         → redirect to /iniciar-sesion
 * – Pending approval   → redirect to /pendiente
 * – Rejected           → redirect to /rechazado
 * – Active + signed in → renders children
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return (
    <>
      <Show when="signed-in">
        <StatusGate>{children}</StatusGate>
      </Show>
      <Show when="signed-out">
        <Redirect to="/iniciar-sesion" />
      </Show>
    </>
  );
}

/**
 * Gate a route behind the "administrator" role.
 * – Admin      → renders children.
 * – Participant → shows "Acceso restringido" toast and redirects to /dashboard.
 * – Loading    → renders nothing (avoids flash).
 *
 * Must be used inside ProtectedRoute (or any route that guarantees the user
 * is already authenticated).
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
