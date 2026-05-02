import { Redirect } from "wouter";

// Legacy event-detail page replaced by /eventos/:slug
export default function EventDetailPage(_props: { eventId?: string }) {
  return <Redirect to="/eventos" />;
}
