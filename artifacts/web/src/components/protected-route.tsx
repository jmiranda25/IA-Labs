import { useEffect, useRef } from "react";
import { Show } from "@clerk/react";
import { Redirect, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * StatusGate — called inside Clerk's "signed-in" guard.
 * Checks the DB user's status and redirects pending/rejected users
 * before rendering any protected content.
 */
function StatusGate({ children }: ProtectedRouteProps) {
  const { data: me, isLoading, error } = useGetMe();

  if (isLoading) return null;

  // Handle HTTP 403 responses from requireAuth (returned when row exists with pending/rejected status)
  const errorCode = (error as any)?.response?.data?.code ?? (error as any)?.data?.code;
  if (errorCode === "PENDING_APPROVAL") return <Redirect to="/pendiente" />;
  if (errorCode === "ACCOUNT_REJECTED") return <Redirect to="/rechazado" />;

  // Handle 200 responses where status is embedded in the user object (first login)
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
