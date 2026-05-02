import { useEffect } from "react";
import { useLocation } from "wouter";

export default function MembersRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/miembros", { replace: true }); }, [setLocation]);
  return null;
}
