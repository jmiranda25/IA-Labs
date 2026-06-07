import { Redirect } from "wouter";

/**
 * /cuenta — redirects to /perfil where profile and settings are managed.
 * Previously rendered Clerk's UserProfile component.
 */
export default function CuentaPage() {
  return <Redirect to="/perfil" />;
}
