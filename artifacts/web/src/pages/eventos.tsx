import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import {
  listEvents,
  getListEventsQueryKey,
  useGetMe,
  useAdminCreateEvent,
  getAdminListEventsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { useInView } from "react-intersection-observer";
import { useDebounce } from "@/hooks/use-debounce";
import { Calendar, MapPin, Video, Users, Clock, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
      <div
        className="relative overflow-hidden cursor-pointer h-64 sm:h-72 transition-transform hover:scale-[1.03] duration-300"
        data-testid={`card-event-${event.slug}`}
      >
        {/* Full-bleed background */}
        {event.coverUrl ? (
          <img
            src={event.coverUrl}
            alt={event.title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
            <Calendar className="h-12 w-12 text-primary/30" />
          </div>
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Type badge — top right */}
        <div className="absolute top-3 right-3">
          {event.isOnline ? (
            <span className="inline-block rounded-none bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-secondary-foreground">
              Online
            </span>
          ) : (
            <span className="inline-block rounded-none bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-secondary-foreground">
              Presencial
            </span>
          )}
        </div>

        {/* RSVP badge */}
        {myActive && (
          <div className="absolute top-3 left-3">
            <span className="inline-block rounded-none bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
              {event.myRsvp === "going" ? "Voy" : "Interesado"}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1.5">
          <h3 className="font-light text-white text-lg leading-tight line-clamp-2">
            {event.title}
          </h3>
          <div className="flex items-center gap-3 text-white/70 text-xs">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatCardDate(event.startsAt as unknown as string)}
            </span>
            {!event.isOnline && event.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            )}
            {event.isOnline && (
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                Online
              </span>
            )}
          </div>
          {event.capacity != null && (
            <div className="flex items-center gap-1 text-white/70 text-xs">
              <Users className="h-3 w-3" />
              {event.counts?.going ?? 0} van / {event.capacity}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function EventCardSkeleton() {
  return (
    <div className="relative overflow-hidden h-64 sm:h-72">
      <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
    </div>
  );
}

const createEventSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().default(""),
  startsAt: z.string().min(1, "La fecha de inicio es requerida"),
  endsAt: z.string().min(1, "La fecha de fin es requerida"),
  isOnline: z.boolean().default(false),
  location: z.string().default(""),
  capacity: z.string().default(""),
  meetingUrl: z.string().default(""),
});
type CreateEventValues = z.infer<typeof createEventSchema>;

function CreateEventDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const createMutation = useAdminCreateEvent();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateEventValues>({ resolver: zodResolver(createEventSchema) });

  const isOnlineVal = watch("isOnline");

  useEffect(() => {
    if (open) {
      reset({
        title: "",
        description: "",
        startsAt: "",
        endsAt: "",
        isOnline: false,
        location: "",
        capacity: "",
        meetingUrl: "",
      });
    }
  }, [open, reset]);

  const onSubmit = async (vals: CreateEventValues) => {
    const body = {
      title: vals.title,
      description: vals.description,
      startsAt: new Date(vals.startsAt).toISOString(),
      endsAt: new Date(vals.endsAt).toISOString(),
      location: vals.location || undefined,
      capacity: vals.capacity ? parseInt(vals.capacity) : undefined,
      isOnline: vals.isOnline,
      meetingUrl: vals.meetingUrl || undefined,
    };
    try {
      await createMutation.mutateAsync({ data: body });
      toast.success("Evento creado");
      onCreated();
      onClose();
    } catch {
      toast.error("Error al crear el evento. Revisa los campos e intenta de nuevo.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo evento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Título *</Label>
            <Input id="ev-title" {...register("title")} data-testid="input-event-title" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-starts">Inicio *</Label>
              <Input id="ev-starts" type="datetime-local" {...register("startsAt")} data-testid="input-event-starts" />
              {errors.startsAt && <p className="text-xs text-destructive">{errors.startsAt.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-ends">Fin *</Label>
              <Input id="ev-ends" type="datetime-local" {...register("endsAt")} data-testid="input-event-ends" />
              {errors.endsAt && <p className="text-xs text-destructive">{errors.endsAt.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Descripción</Label>
            <Textarea id="ev-desc" {...register("description")} rows={4} data-testid="input-event-description" />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="ev-online"
              checked={isOnlineVal}
              onCheckedChange={(v) => setValue("isOnline", v)}
            />
            <Label htmlFor="ev-online">Evento online</Label>
          </div>
          {!isOnlineVal && (
            <div className="space-y-1.5">
              <Label htmlFor="ev-location">Ubicación</Label>
              <Input id="ev-location" {...register("location")} data-testid="input-event-location" />
            </div>
          )}
          {isOnlineVal && (
            <div className="space-y-1.5">
              <Label htmlFor="ev-url">URL del evento</Label>
              <Input id="ev-url" {...register("meetingUrl")} type="url" data-testid="input-event-meeting-url" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ev-capacity">Capacidad máxima</Label>
            <Input id="ev-capacity" type="number" min={1} {...register("capacity")} data-testid="input-event-capacity" />
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} data-testid="btn-save-event">
              {isSubmitting ? "Creando…" : "Crear evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EventosPage() {
  const [tab, setTab] = useState<TabStatus>("upcoming");
  const [mode, setMode] = useState<EventMode | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const q = useDebounce(search, 300);
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "administrator";

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

  const handleEventCreated = () => {
    qc.invalidateQueries({ queryKey: getListEventsQueryKey({ status: tab, mode, q }) });
    qc.invalidateQueries({ queryKey: getAdminListEventsQueryKey() });
  };

  return (
    <Layout>
      <Helmet>
        <title>Eventos y workshops — IA Labs</title>
        <meta name="description" content="Meetups, talleres y conferencias de la comunidad hispanohablante de IA. Regístrate y asiste." />
        <meta property="og:title" content="Eventos y workshops — IA Labs" />
        <meta property="og:description" content="Meetups, talleres y conferencias de la comunidad hispanohablante de IA." />
      </Helmet>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-foreground flex items-center gap-3">
              <Calendar className="h-7 w-7 text-primary" />
              Eventos
            </h1>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-2">
              Meetups, talleres y conferencias de la comunidad
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="btn-nuevo-evento">
              <Plus className="h-4 w-4 mr-1.5" />
              Nuevo evento
            </Button>
          )}
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
                {isAdmin && tab === "upcoming" && !q && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Crear el primer evento
                  </Button>
                )}
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

      <CreateEventDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleEventCreated}
      />
    </Layout>
  );
}
