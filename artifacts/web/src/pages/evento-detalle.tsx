import { useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout";
import {
  useGetEvent,
  useRsvpEvent,
  getGetEventQueryKey,
  type RsvpBodyStatus,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  Link2,
  Check,
  Star,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { EventDetail } from "@workspace/api-client-react";

interface EventoDetalleProps {
  slug: string;
}

function formatRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const loc = navigator.language || "es";
  const dateFmt = new Intl.DateTimeFormat(loc, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat(loc, {
    hour: "numeric",
    minute: "2-digit",
  });
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
  }
  return `${dateFmt.format(start)}, ${timeFmt.format(start)} – ${dateFmt.format(end)}, ${timeFmt.format(end)}`;
}

const RSVP_OPTIONS = [
  { value: "going", label: "Voy", icon: Check },
  { value: "interested", label: "Me interesa", icon: Star },
] as const;

export default function EventoDetalle({ slug }: EventoDetalleProps) {
  const qc = useQueryClient();
  const { data, isLoading } = useGetEvent(slug, {
    query: { queryKey: getGetEventQueryKey(slug) },
  });
  const rsvpMutation = useRsvpEvent();

  const event = data as EventDetail | undefined;

  const handleRsvp = (status: string) => {
    rsvpMutation.mutate(
      { slug, data: { status: status as RsvpBodyStatus } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetEventQueryKey(slug) });
          const msg =
            status === "going"
              ? "¡Confirmada tu asistencia!"
              : status === "interested"
                ? "Has marcado interés en el evento."
                : "RSVP cancelado.";
          toast.success(msg);
        },
        onError: (err: unknown) => {
          const errMsg = (err as { response?: { data?: { error?: string } } })
            ?.response?.data?.error;
          if (errMsg === "event_full") {
            toast.error("El evento está lleno.");
          } else {
            toast.error("Error al actualizar tu RSVP.");
          }
        },
      },
    );
  };

  const cancelRsvp = () => handleRsvp("cancelled");

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto p-6 text-center py-20">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-25 text-muted-foreground" />
          <p className="text-muted-foreground">Evento no encontrado.</p>
          <Link href="/eventos" className="text-primary hover:underline text-sm mt-2 inline-block">
            ← Volver a eventos
          </Link>
        </div>
      </Layout>
    );
  }

  const myRsvp = event.myRsvp;
  const hasActiveRsvp = myRsvp && myRsvp !== "cancelled";
  const isFull =
    event.capacity !== null &&
    event.capacity !== undefined &&
    event.counts.going >= event.capacity;

  const capacityPct = event.capacity
    ? Math.min(100, Math.round((event.counts.going / event.capacity) * 100))
    : 0;

  return (
    <Layout>
      <Helmet>
        <title>{event.title} — AI Community</title>
        <meta name="description" content={event.description?.slice(0, 155) ?? `Evento de la comunidad hispanohablante de IA: ${event.title}`} />
        <meta property="og:title" content={event.title} />
        <meta property="og:description" content={event.description?.slice(0, 155) ?? ""} />
        {event.coverUrl && <meta property="og:image" content={event.coverUrl} />}
        <meta property="og:type" content="event" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Event",
          name: event.title,
          startDate: event.startsAt,
          endDate: event.endsAt,
          description: event.description ?? undefined,
          image: event.coverUrl ?? undefined,
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: event.isOnline
            ? "https://schema.org/OnlineEventAttendanceMode"
            : "https://schema.org/OfflineEventAttendanceMode",
          location: event.isOnline
            ? { "@type": "VirtualLocation", url: event.meetingUrl ?? undefined }
            : { "@type": "Place", name: event.location ?? undefined },
          organizer: { "@type": "Organization", name: "AI Community", url: "https://aicommunity.app" },
        })}</script>
      </Helmet>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Back link */}
        <Link
          href="/eventos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Todos los eventos
        </Link>

        {/* Cover hero */}
        {event.coverUrl ? (
          <div className="h-64 sm:h-80 overflow-hidden rounded-xl">
            <img
              src={event.coverUrl}
              alt={event.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="h-48 rounded-xl bg-gradient-to-br from-primary/25 to-accent/15 flex items-center justify-center">
            <Calendar className="h-16 w-16 text-primary/30" />
          </div>
        )}

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-2xl font-bold flex-1">{event.title}</h1>
            {event.isOnline ? (
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shrink-0">
                Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0">
                Presencial
              </Badge>
            )}
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <span className="capitalize">
                {formatRange(
                  event.startsAt as unknown as string,
                  event.endsAt as unknown as string,
                )}
              </span>
            </div>
            {!event.isOnline && event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span>{event.location}</span>
              </div>
            )}
            {event.isOnline && hasActiveRsvp && event.meetingUrl && (
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 shrink-0 text-primary" />
                <a
                  href={event.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Unirse al evento
                </a>
              </div>
            )}
            {event.isOnline && !hasActiveRsvp && (
              <div className="flex items-center gap-2 text-muted-foreground/60">
                <Video className="h-4 w-4 shrink-0" />
                <span className="text-xs italic">
                  El enlace estará disponible cuando confirmes asistencia.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Counts + Capacity */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                <strong>{event.counts.going}</strong> confirmados
              </span>
              {event.counts.interested > 0 && (
                <span className="text-muted-foreground">
                  · {event.counts.interested} interesados
                </span>
              )}
              {event.capacity && (
                <span className="text-muted-foreground ml-auto text-xs">
                  {event.counts.going}/{event.capacity}
                  {isFull && (
                    <Badge
                      variant="destructive"
                      className="ml-1.5 text-[10px] px-1.5 py-0"
                    >
                      Lleno
                    </Badge>
                  )}
                </span>
              )}
            </div>
            {event.capacity && (
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    capacityPct >= 100 ? "bg-destructive" : "bg-primary",
                  )}
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* RSVP */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">¿Vas a asistir?</p>
            <div className="flex gap-2 flex-wrap">
              {RSVP_OPTIONS.map((opt) => {
                const isActive = myRsvp === opt.value;
                return (
                  <Button
                    key={opt.value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRsvp(opt.value)}
                    disabled={
                      rsvpMutation.isPending ||
                      (opt.value === "going" && isFull && !isActive)
                    }
                    data-testid={`btn-rsvp-${opt.value}`}
                    className={cn(
                      isActive && opt.value === "going" && "bg-primary",
                      isActive && opt.value === "interested" && "bg-accent text-accent-foreground",
                    )}
                  >
                    <opt.icon className="h-3.5 w-3.5 mr-1.5" />
                    {opt.label}
                  </Button>
                );
              })}
              {hasActiveRsvp && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelRsvp}
                  disabled={rsvpMutation.isPending}
                  className="text-muted-foreground"
                  data-testid="btn-rsvp-cancel"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancelar RSVP
                </Button>
              )}
            </div>
            {hasActiveRsvp && (
              <p className="text-xs text-muted-foreground">
                {myRsvp === "going"
                  ? "✓ Estás confirmado/a para este evento."
                  : "★ Has marcado interés en este evento."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        {event.description && (
          <Card>
            <CardContent className="p-5 prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {event.description}
              </ReactMarkdown>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
