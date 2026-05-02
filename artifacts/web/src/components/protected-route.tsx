import { Show } from "@clerk/react";
import { Redirect } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Gate a route behind Clerk authentication.
 * – Signed in  → renders children as-is.
 * – Signed out → redirects to /iniciar-sesion.
 *
 * Usage:
 *   <Route path="/dashboard">
 *     <ProtectedRoute><DashboardPage /></ProtectedRoute>
 *   </Route>
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
