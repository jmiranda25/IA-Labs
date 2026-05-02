import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useGetMe,
  useGetAdminStats,
  useAdminListUsers,
  useAdminUpdateUserRole,
  useAdminBanUser,
  useGetModerationQueue,
  useResolveModerationItem,
  useGetLandingContent,
  useUpdateLandingSection,
  useAdminListEvents,
  useAdminCreateEvent,
  useAdminUpdateEvent,
  useAdminDeleteEvent,
  useAdminUploadEventCover,
  getGetAdminStatsQueryKey,
  getAdminListUsersQueryKey,
  getGetModerationQueueQueryKey,
  getGetLandingContentQueryKey,
  getAdminListEventsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Shield, Users, AlertTriangle, BarChart3, Edit3, Check, X,
  Calendar, Plus, Trash2, Upload,
} from "lucide-react";

// ── Admin Stats ───────────────────────────────────────────────────────────────

function AdminStats() {
  const { data: stats } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });
  if (!stats) return <Skeleton className="h-40 rounded-xl" />;
  const s = stats as any;
  const items = [
    { label: "Total Members", value: s.totalUsers },
    { label: "New This Week", value: s.newUsersThisWeek },
    { label: "Total Events", value: s.totalEvents },
    { label: "Forum Posts", value: s.totalForumPosts },
    { label: "Resources", value: s.totalResources },
    { label: "Listings", value: s.totalListings },
    { label: "Pending Mod", value: s.pendingModerationItems, highlight: s.pendingModerationItems > 0 },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map(({ label, value, highlight }) => (
        <Card key={label} className={highlight ? "border-destructive/40" : ""}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${highlight ? "text-destructive" : ""}`} data-testid={`admin-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── User Management ───────────────────────────────────────────────────────────

function UserManagement() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { data } = useAdminListUsers({ search: search || undefined, limit: 50 }, { query: { queryKey: getAdminListUsersQueryKey({ search: search || undefined, limit: 50 }) } });
  const updateRole = useAdminUpdateUserRole();
  const banUser = useAdminBanUser();
  const users = (data as any)?.users ?? [];

  return (
    <div className="space-y-4">
      <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-admin-user-search" />
      <div className="space-y-2">
        {users.map((u: any) => (
          <Card key={u.id} data-testid={`admin-user-${u.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={u.avatarUrl} />
                  <AvatarFallback className="text-xs">{u.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{u.displayName}</p>
                    <Badge variant={u.role === "administrator" ? "default" : "secondary"} className="text-[10px]">{u.role}</Badge>
                    {u.isBanned && <Badge variant="destructive" className="text-[10px]">Banned</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{u.clerkId}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={u.role}
                    onValueChange={(role) => updateRole.mutate({ userId: u.clerkId, data: { role: role as "participant" | "administrator" } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) }) })}
                  >
                    <SelectTrigger className="h-7 text-xs w-32" data-testid={`select-role-${u.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="participant">Participant</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  {!u.isBanned && (
                    <Button size="sm" variant="destructive" className="h-7 text-xs"
                      onClick={() => banUser.mutate({ userId: u.clerkId }, { onSuccess: () => qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) }) })}
                      data-testid={`button-ban-${u.id}`}
                    >
                      Ban
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Moderation Queue ──────────────────────────────────────────────────────────

function ModerationQueue() {
  const qc = useQueryClient();
  const { data } = useGetModerationQueue({ query: { queryKey: getGetModerationQueueQueryKey() } });
  const resolve = useResolveModerationItem();
  const items = (data as any[]) ?? [];

  const handleResolve = (itemId: string, action: string) => {
    resolve.mutate({ itemId, data: { action: action as "remove" | "keep" } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetModerationQueueQueryKey() }) });
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Check className="h-10 w-10 mx-auto mb-3 text-green-400 opacity-50" />
          <p>No items pending moderation</p>
        </div>
      ) : items.map((item: any) => (
        <Card key={item.id} className="border-yellow-500/20" data-testid={`mod-item-${item.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-semibold capitalize">{item.contentType} reported</span>
                  <Badge variant="secondary" className="text-[10px]">{item.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Reason: {item.reason}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Content ID: {item.contentId}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => handleResolve(item.id, "keep")} data-testid={`button-keep-${item.id}`}>
                  <Check className="h-3 w-3" />Keep
                </Button>
                <Button size="sm" variant="destructive" className="h-7 gap-1" onClick={() => handleResolve(item.id, "remove")} data-testid={`button-remove-${item.id}`}>
                  <X className="h-3 w-3" />Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Landing Editor ────────────────────────────────────────────────────────────

function LandingEditor() {
  const qc = useQueryClient();
  const { data: sections } = useGetLandingContent({ query: { queryKey: getGetLandingContentQueryKey() } });
  const updateSection = useUpdateLandingSection();
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const hero = (sections as any[])?.find((s: any) => s.section === "hero")?.content ?? {};

  const save = async () => {
    setSaving(true);
    await updateSection.mutateAsync({ section: "hero", data: { content: { ...hero, ...edits } } });
    qc.invalidateQueries({ queryKey: getGetLandingContentQueryKey() });
    setEdits({});
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Edit3 className="h-4 w-4 text-primary" />Landing Page Content</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Headline</p>
          <Input defaultValue={hero.headline ?? ""} onChange={(e) => setEdits((p) => ({ ...p, headline: e.target.value }))} data-testid="input-landing-headline" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Subtitle</p>
          <Input defaultValue={hero.subtitle ?? ""} onChange={(e) => setEdits((p) => ({ ...p, subtitle: e.target.value }))} data-testid="input-landing-subtitle" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">CTA Button Text</p>
          <Input defaultValue={hero.cta ?? ""} onChange={(e) => setEdits((p) => ({ ...p, cta: e.target.value }))} data-testid="input-landing-cta" />
        </div>
        <Button onClick={save} disabled={saving || Object.keys(edits).length === 0} data-testid="button-save-landing">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Eventos Admin ─────────────────────────────────────────────────────────────

const eventSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().default(""),
  startsAt: z.string().min(1, "La fecha de inicio es requerida"),
  endsAt: z.string().min(1, "La fecha de fin es requerida"),
  location: z.string().default(""),
  capacity: z.string().default(""),
  isOnline: z.boolean().default(false),
  meetingUrl: z.string().default(""),
});
type EventFormValues = z.infer<typeof eventSchema>;

function toLocalDT(iso: string) {
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function EventosAdmin() {
  const qc = useQueryClient();
  const { data: eventosRaw } = useAdminListEvents({ query: { queryKey: getAdminListEventsQueryKey() } });
  const eventos = (eventosRaw as any[]) ?? [];

  const createMutation = useAdminCreateEvent();
  const updateMutation = useAdminUpdateEvent();
  const deleteMutation = useAdminDeleteEvent();
  const coverMutation = useAdminUploadEventCover();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({ resolver: zodResolver(eventSchema) });

  const isOnlineVal = watch("isOnline");

  const openCreate = () => {
    setEditing(null);
    reset({ title: "", description: "", startsAt: "", endsAt: "", location: "", capacity: "", isOnline: false, meetingUrl: "" });
    setDialogOpen(true);
  };

  const openEdit = (ev: any) => {
    setEditing(ev);
    reset({
      title: ev.title,
      description: ev.description ?? "",
      startsAt: toLocalDT(ev.startsAt),
      endsAt: toLocalDT(ev.endsAt),
      location: ev.location ?? "",
      capacity: ev.capacity != null ? String(ev.capacity) : "",
      isOnline: ev.isOnline ?? false,
      meetingUrl: ev.meetingUrl ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (vals: EventFormValues) => {
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
      if (editing) {
        await updateMutation.mutateAsync({ slug: editing.slug, data: body });
        toast.success("Evento actualizado");
      } else {
        await createMutation.mutateAsync({ data: body });
        toast.success("Evento creado");
      }
      qc.invalidateQueries({ queryKey: getAdminListEventsQueryKey() });
      setDialogOpen(false);
    } catch {
      toast.error("Error al guardar el evento.");
    }
  };

  const handleDelete = async (slug: string) => {
    if (!window.confirm("¿Eliminar este evento permanentemente?")) return;
    try {
      await deleteMutation.mutateAsync({ slug });
      qc.invalidateQueries({ queryKey: getAdminListEventsQueryKey() });
      toast.success("Evento eliminado");
    } catch {
      toast.error("Error al eliminar el evento.");
    }
  };

  const handleCover = async (slug: string, file: File) => {
    const fd = new FormData();
    fd.append("cover", file);
    try {
      await coverMutation.mutateAsync({ slug, data: fd as any });
      qc.invalidateQueries({ queryKey: getAdminListEventsQueryKey() });
      toast.success("Portada actualizada");
    } catch {
      toast.error("Error al subir la portada.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{eventos.length} evento{eventos.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={openCreate} data-testid="btn-nuevo-evento">
          <Plus className="h-4 w-4 mr-1.5" />Nuevo Evento
        </Button>
      </div>

      <div className="space-y-2">
        {eventos.length === 0 && (
          <p className="text-center py-10 text-sm text-muted-foreground">No hay eventos aún.</p>
        )}
        {eventos.map((ev: any) => (
          <Card key={ev.id} data-testid={`admin-event-${ev.slug}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-12 w-16 rounded overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                {ev.coverUrl ? (
                  <img src={ev.coverUrl} alt={ev.title} className="h-full w-full object-cover" />
                ) : (
                  <Calendar className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ev.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                  <span>{new Date(ev.startsAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span>·</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0">
                    {ev.isOnline ? "Online" : "Presencial"}
                  </Badge>
                  <span>·</span>
                  <span>{ev.counts?.going ?? 0}{ev.capacity ? `/${ev.capacity}` : ""} van</span>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <label className="cursor-pointer" title="Subir portada">
                  <Button size="icon" variant="ghost" className="h-7 w-7 pointer-events-none" tabIndex={-1} asChild>
                    <span><Upload className="h-3.5 w-3.5" /></span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCover(ev.slug, f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(ev)} data-testid={`btn-edit-event-${ev.slug}`}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(ev.slug)} data-testid={`btn-delete-event-${ev.slug}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar evento" : "Nuevo evento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">Título *</Label>
              <Input id="ev-title" {...register("title")} placeholder="Nombre del evento" data-testid="input-event-title" />
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
              <Label htmlFor="ev-desc">Descripción (Markdown)</Label>
              <Textarea id="ev-desc" {...register("description")} rows={5} placeholder="Describe el evento…" data-testid="input-event-description" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-location">Ubicación</Label>
              <Input id="ev-location" {...register("location")} placeholder="Ciudad, dirección…" data-testid="input-event-location" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ev-capacity">Capacidad máxima</Label>
              <Input id="ev-capacity" type="number" min={1} {...register("capacity")} placeholder="Sin límite" data-testid="input-event-capacity" />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="ev-online"
                checked={isOnlineVal}
                onCheckedChange={(v) => setValue("isOnline", v)}
              />
              <Label htmlFor="ev-online">Evento online</Label>
            </div>

            {isOnlineVal && (
              <div className="space-y-1.5">
                <Label htmlFor="ev-url">URL del evento</Label>
                <Input
                  id="ev-url"
                  {...register("meetingUrl")}
                  placeholder="https://meet.google.com/…"
                  type="url"
                  data-testid="input-event-meeting-url"
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="btn-save-event">
                {isSubmitting ? "Guardando…" : editing ? "Actualizar" : "Crear evento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Admin Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: me, isLoading } = useGetMe();
  if (isLoading) return <Layout><Skeleton className="m-6 h-64 rounded-xl" /></Layout>;
  if ((me as any)?.role !== "administrator") return <Redirect to="/dashboard" />;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />Admin Panel
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage community, users, and moderation.
          </p>
        </div>

        <Tabs defaultValue="stats">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="stats" data-testid="tab-admin-stats"><BarChart3 className="h-4 w-4 mr-1.5" />Stats</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-admin-users"><Users className="h-4 w-4 mr-1.5" />Users</TabsTrigger>
            <TabsTrigger value="moderation" data-testid="tab-admin-moderation"><AlertTriangle className="h-4 w-4 mr-1.5" />Moderation</TabsTrigger>
            <TabsTrigger value="landing" data-testid="tab-admin-landing"><Edit3 className="h-4 w-4 mr-1.5" />Landing</TabsTrigger>
            <TabsTrigger value="eventos" data-testid="tab-admin-eventos"><Calendar className="h-4 w-4 mr-1.5" />Eventos</TabsTrigger>
          </TabsList>
          <TabsContent value="stats" className="mt-6"><AdminStats /></TabsContent>
          <TabsContent value="users" className="mt-6"><UserManagement /></TabsContent>
          <TabsContent value="moderation" className="mt-6"><ModerationQueue /></TabsContent>
          <TabsContent value="landing" className="mt-6"><LandingEditor /></TabsContent>
          <TabsContent value="eventos" className="mt-6"><EventosAdmin /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
