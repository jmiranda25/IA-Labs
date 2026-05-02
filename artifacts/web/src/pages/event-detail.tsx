import { Layout } from "@/components/layout";
import { useGetEvent, useUpsertRsvp, useCancelRsvp, useListEventAttendees, getGetEventQueryKey, getListEventAttendeesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Video, Users, ExternalLink } from "lucide-react";

export default function EventDetailPage({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const { data: event, isLoading } = useGetEvent(eventId, { query: { queryKey: getGetEventQueryKey(eventId) } });
  const { data: attendees } = useListEventAttendees(eventId, { query: { queryKey: getListEventAttendeesQueryKey(eventId) } });
  const upsertRsvp = useUpsertRsvp();
  const cancelRsvp = useCancelRsvp();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
    qc.invalidateQueries({ queryKey: getListEventAttendeesQueryKey(eventId) });
  };

  if (isLoading) return <Layout><div className="max-w-3xl mx-auto p-6"><Skeleton className="h-96 rounded-xl" /></div></Layout>;
  if (!event) return <Layout><div className="p-6 text-center text-muted-foreground">Event not found.</div></Layout>;

  const e = event as any;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {e.coverUrl && (
          <div className="h-56 rounded-xl overflow-hidden">
            <img src={e.coverUrl} alt={e.title} className="w-full h-full object-cover" />
          </div>
        )}

        <Card>
          <CardContent className="p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold" data-testid="text-event-title">{e.title}</h1>
              <Badge variant="secondary" className="shrink-0">{e.status}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>{format(new Date(e.startAt), "EEEE, MMM d, yyyy 'at' h:mm a")}</span>
              </div>
              {e.endAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Ends {format(new Date(e.endAt), "h:mm a")}</span>
                </div>
              )}
              {e.isVirtual ? (
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <span>Virtual event</span>
                  {e.virtualLink && (
                    <a href={e.virtualLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      Join link <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ) : e.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{e.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>{e.attendeeCount} attending{e.maxAttendees ? ` / ${e.maxAttendees} spots` : ""}</span>
              </div>
            </div>

            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{e.description}</p>

            {/* RSVP */}
            {e.status !== "cancelled" && e.status !== "past" && (
              <div className="flex gap-3">
                {e.myRsvp === "going" ? (
                  <>
                    <Badge variant="secondary" className="text-green-400 bg-green-500/10 px-3 py-1.5">You are going</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelRsvp.mutate({ eventId }, { onSuccess: refresh })}
                      data-testid="button-cancel-rsvp"
                    >
                      Cancel RSVP
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => upsertRsvp.mutate({ eventId, data: { status: "going" } }, { onSuccess: refresh })}
                    disabled={upsertRsvp.isPending}
                    data-testid="button-rsvp"
                  >
                    {upsertRsvp.isPending ? "RSVPing..." : "RSVP — I'm going"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendees */}
        {(attendees as any[])?.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Attendees ({(attendees as any[]).length})
              </h2>
              <div className="flex flex-wrap gap-3">
                {(attendees as any[]).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2" data-testid={`attendee-${a.userId}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={a.user?.avatarUrl} />
                      <AvatarFallback className="text-xs">{a.user?.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{a.user?.displayName}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
