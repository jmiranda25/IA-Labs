import { Redirect } from "wouter";

// Legacy route — events module moved to /eventos
export default function EventsPage() {
  return <Redirect to="/eventos" />;
}
