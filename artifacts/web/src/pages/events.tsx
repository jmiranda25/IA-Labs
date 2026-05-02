import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListEvents, getListEventsQueryKey, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Calendar, MapPin, Video, Users, Clock } from "lucide-react";
import { format } from "date-fns";

function EventCard({ event }: { event: any }) {
  const statusColors: Record<string, string> = {
    upcoming: "bg-primary/10 text-primary",
    ongoing: "bg-green-500/10 text-green-400",
    past: "bg-muted text-muted-foreground",
    cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="hover:border-primary/40 transition-all hover:-translate-y-0.5 cursor-pointer h-full" data-testid={`card-event-${event.id}`}>
        {event.coverUrl && (
          <div className="h-40 overflow-hidden rounded-t-xl">
            <img src={event.coverUrl} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-semibold text-foreground line-clamp-2">{event.title}</h3>
            <Badge className={`text-xs shrink-0 ${statusColors[event.status] ?? ""}`} variant="secondary">
              {event.status}
            </Badge>
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{format(new Date(event.startAt), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
            {event.isVirtual ? (
              <div className="flex items-center gap-2">
                <Video className="h-3.5 w-3.5 shrink-0" />
                <span>Virtual event</span>
              </div>
            ) : event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>{event.attendeeCount} attending{event.maxAttendees ? ` / ${event.maxAttendees} max` : ""}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-xs">{event.hostName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">Hosted by {event.hostName}</span>
          </div>

          {event.myRsvp && (
            <Badge variant="secondary" className="mt-3 text-xs">{event.myRsvp === "going" ? "You're going" : event.myRsvp}</Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function EventsPage() {
  const [tab, setTab] = useState("upcoming");
  const { data, isLoading } = useListEvents(
    { status: tab, limit: "12" },
    { query: { queryKey: getListEventsQueryKey({ status: tab, limit: "12" }) } }
  );
  const events = (data as any)?.events ?? [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6 text-primary" />Events</h1>
            <p className="text-muted-foreground text-sm mt-1">Community meetups, workshops, and conferences.</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">Past</TabsTrigger>
          </TabsList>
          <TabsContent value={tab}>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No {tab} events yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((e: any) => <EventCard key={e.id} event={e} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
