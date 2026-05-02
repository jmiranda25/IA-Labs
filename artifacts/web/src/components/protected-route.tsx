import { useEffect, useRef } from "react";
import { Show } from "@clerk/react";
import { Redirect, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Gate a route behind Clerk authentication.
 * – Signed in  → renders children.
 * – Signed out → redirects to /iniciar-sesion.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
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
