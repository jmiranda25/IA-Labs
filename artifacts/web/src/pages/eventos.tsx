import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { listEvents, getListEventsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { useInView } from "react-intersection-observer";
import { useDebounce } from "@/hooks/use-debounce";
import { Calendar, MapPin, Video, Users, Clock, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventDetail, EventListPageResponse } from "@workspace/api-client-react";

type TabStatus = "upcoming" | "past";
type EventMode = "online" | "in_person";

function formatCardDate(iso: string) {
  return new Intl.DateTimeFormat(navigator.language || "es", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function EventCard({ event }: { event: EventDetail }) {
  const myActive = event.myRsvp && event.myRsvp !== "cancelled";
  return (
    <Link href={`/eventos/${event.slug}`}>
      <Card
        className="hover:border-primary/50 transition-all hover:-translate-y-0.5 cursor-pointer h-full"
        data-testid={`card-event-${event.slug}`}
      >
        {event.coverUrl && (
          <div className="h-40 overflow-hidden rounded-t-xl">
            <img
              src={event.coverUrl}
              alt={event.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        {!event.coverUrl && (
          <div className="h-32 rounded-t-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
            <Calendar className="h-10 w-10 text-primary/40" />
          </div>
        )}
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">
              {event.title}
            </h3>
            {event.isOnline ? (
              <Badge variant="secondary" className="shrink-0 text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Presencial
              </Badge>
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{formatCardDate(event.startsAt as unknown as string)}</span>
            </div>
            {!event.isOnline && event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            {event.isOnline && (
              <div className="flex items-center gap-1.5">
                <Video className="h-3 w-3 shrink-0" />
                <span>Evento online</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 shrink-0" />
              <span>
                {event.counts.going} van
                {event.capacity ? ` / ${event.capacity}` : ""}
                {event.counts.interested > 0 &&
                  ` · ${event.counts.interested} interesados`}
              </span>
            </div>
          </div>

          {myActive && (
            <Badge
              variant="secondary"
              className="text-xs bg-primary/10 text-primary border-primary/20"
            >
              {event.myRsvp === "going" ? "✓ Voy" : "★ Me interesa"}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function EventCardSkeleton() {
  return (
    <Card>
      <Skeleton className="h-40 rounded-t-xl rounded-b-none" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}

export default function EventosPage() {
  const [tab, setTab] = useState<TabStatus>("upcoming");
  const [mode, setMode] = useState<EventMode | undefined>(undefined);
  const [search, setSearch] = useState("");
  const q = useDebounce(search, 300);

  const queryKey = [
    ...getListEventsQueryKey({ status: tab, mode, q }),
    "infinite",
  ];

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      listEvents({ status: tab, mode, q, cursor: pageParam, limit: 12 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: { nextCursor?: string | null }) =>
      lastPage.nextCursor ?? undefined,
  });

  const { ref, inView } = useInView({ threshold: 0 });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const events = data?.pages.flatMap((p) => (p as EventListPageResponse).items) ?? [];

  const handleTabChange = (value: string) => {
    setTab(value as TabStatus);
  };

  return (
    <Layout>
      <Helmet>
        <title>Eventos y workshops — AI Community</title>
        <meta name="description" content="Meetups, talleres y conferencias de la comunidad hispanohablante de IA. Regístrate y asiste." />
        <meta property="og:title" content="Eventos y workshops — AI Community" />
        <meta property="og:description" content="Meetups, talleres y conferencias de la comunidad hispanohablante de IA." />
      </Helmet>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Eventos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Meetups, talleres y conferencias de la comunidad.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-eventos"
            />
          </div>
          <div className="flex gap-1.5">
            {(
              [
                { value: undefined, label: "Todos" },
                { value: "online" as EventMode, label: "Online" },
                { value: "in_person" as EventMode, label: "Presencial" },
              ] as { value: EventMode | undefined; label: string }[]
            ).map((opt) => (
              <Button
                key={opt.label}
                variant={mode === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setMode(opt.value)}
                data-testid={`btn-mode-${opt.label.toLowerCase()}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="upcoming" data-testid="tab-proximos">
              Próximos
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-pasados">
              Pasados
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-25" />
                <p className="text-sm">
                  {q
                    ? `No hay eventos que coincidan con "${q}"`
                    : tab === "upcoming"
                      ? "No hay eventos próximos."
                      : "No hay eventos pasados."}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
                <div ref={ref} className="flex justify-center py-8">
                  {isFetchingNextPage && (
                    <div className="flex gap-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-3 w-3 rounded-full" />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
