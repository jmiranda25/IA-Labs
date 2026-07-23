import { useState } from "react";
import {
  getAdminListEventsQueryKey,
  useAdminListEvents,
  useAdminCreateEvent,
  useAdminUpdateEvent,
  useAdminDeleteEvent,
  useAdminUploadEventCover,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Calendar, Plus, Trash2, Upload, Edit3 } from "lucide-react";

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
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function EventosAdmin() {
  const qc = useQueryClient();
  const { data: eventosRaw } = useAdminListEvents({ query: { queryKey: getAdminListEventsQueryKey() } });
  const eventos = (eventosRaw as any[]) ?? [];
  const createMutation = useAdminCreateEvent();
  const updateMutation = useAdminUpdateEvent();
  const deleteMutation = useAdminDeleteEvent();
  const coverMutation = useAdminUploadEventCover();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<EventFormValues>({ resolver: zodResolver(eventSchema) });
  const isOnlineVal = watch("isOnline");

  const openCreate = () => { setEditing(null); reset({ title: "", description: "", startsAt: "", endsAt: "", location: "", capacity: "", isOnline: false, meetingUrl: "" }); setDialogOpen(true); };
  const openEdit = (ev: any) => {
    setEditing(ev);
    reset({ title: ev.title, description: ev.description ?? "", startsAt: toLocalDT(ev.startsAt), endsAt: toLocalDT(ev.endsAt), location: ev.location ?? "", capacity: ev.capacity != null ? String(ev.capacity) : "", isOnline: ev.isOnline ?? false, meetingUrl: ev.meetingUrl ?? "" });
    setDialogOpen(true);
  };

  const onSubmit = async (vals: EventFormValues) => {
    const body = { title: vals.title, description: vals.description, startsAt: new Date(vals.startsAt).toISOString(), endsAt: new Date(vals.endsAt).toISOString(), location: vals.location || undefined, capacity: vals.capacity ? parseInt(vals.capacity) : undefined, isOnline: vals.isOnline, meetingUrl: vals.meetingUrl || undefined };
    try {
      if (editing) { await updateMutation.mutateAsync({ slug: editing.slug, data: body }); toast.success("Evento actualizado"); }
      else { await createMutation.mutateAsync({ data: body }); toast.success("Evento creado"); }
      qc.invalidateQueries({ queryKey: getAdminListEventsQueryKey() });
      setDialogOpen(false);
    } catch { toast.error("Error al guardar el evento."); }
  };

  const handleDelete = async (slug: string) => {
    if (!window.confirm("¿Eliminar este evento permanentemente?")) return;
    try { await deleteMutation.mutateAsync({ slug }); qc.invalidateQueries({ queryKey: getAdminListEventsQueryKey() }); toast.success("Evento eliminado"); }
    catch { toast.error("Error al eliminar el evento."); }
  };

  const handleCover = async (slug: string, file: File) => {
    const fd = new FormData();
    fd.append("cover", file);
    try { await coverMutation.mutateAsync({ slug, data: fd as any }); qc.invalidateQueries({ queryKey: getAdminListEventsQueryKey() }); toast.success("Portada actualizada"); }
    catch { toast.error("Error al subir la portada."); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{eventos.length} evento{eventos.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={openCreate} data-testid="btn-nuevo-evento"><Plus className="h-4 w-4 mr-1.5" />Nuevo Evento</Button>
      </div>
      <div className="space-y-2">
        {eventos.length === 0 && <p className="text-center py-10 text-sm text-muted-foreground">No hay eventos aún.</p>}
        {eventos.map((ev: any) => (
          <Card key={ev.id} data-testid={`admin-event-${ev.slug}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-12 w-16 rounded overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                {ev.coverUrl ? <img src={ev.coverUrl} alt={ev.title} className="h-full w-full object-cover" /> : <Calendar className="h-5 w-5 text-muted-foreground/40" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ev.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                  <span>{new Date(ev.startsAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span>·</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0">{ev.isOnline ? "Online" : "Presencial"}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <label className="cursor-pointer" title="Subir portada">
                  <Button size="icon" variant="ghost" className="h-7 w-7 pointer-events-none" tabIndex={-1} asChild><span><Upload className="h-3.5 w-3.5" /></span></Button>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCover(ev.slug, f); e.target.value = ""; }} />
                </label>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(ev)} data-testid={`btn-edit-event-${ev.slug}`} aria-label="Editar evento"><Edit3 className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(ev.slug)} data-testid={`btn-delete-event-${ev.slug}`} aria-label="Eliminar evento"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar evento" : "Nuevo evento"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="ev-title">Título *</Label><Input id="ev-title" {...register("title")} data-testid="input-event-title" />{errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="ev-starts">Inicio *</Label><Input id="ev-starts" type="datetime-local" {...register("startsAt")} data-testid="input-event-starts" />{errors.startsAt && <p className="text-xs text-destructive">{errors.startsAt.message}</p>}</div>
              <div className="space-y-1.5"><Label htmlFor="ev-ends">Fin *</Label><Input id="ev-ends" type="datetime-local" {...register("endsAt")} data-testid="input-event-ends" />{errors.endsAt && <p className="text-xs text-destructive">{errors.endsAt.message}</p>}</div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="ev-desc">Descripción</Label><Textarea id="ev-desc" {...register("description")} rows={4} data-testid="input-event-description" /></div>
            <div className="space-y-1.5"><Label htmlFor="ev-location">Ubicación</Label><Input id="ev-location" {...register("location")} data-testid="input-event-location" /></div>
            <div className="space-y-1.5"><Label htmlFor="ev-capacity">Capacidad máxima</Label><Input id="ev-capacity" type="number" min={1} {...register("capacity")} data-testid="input-event-capacity" /></div>
            <div className="flex items-center gap-3"><Switch id="ev-online" checked={isOnlineVal} onCheckedChange={(v) => setValue("isOnline", v)} /><Label htmlFor="ev-online">Evento online</Label></div>
            {isOnlineVal && <div className="space-y-1.5"><Label htmlFor="ev-url">URL del evento</Label><Input id="ev-url" {...register("meetingUrl")} type="url" data-testid="input-event-meeting-url" /></div>}
            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} data-testid="btn-save-event">{isSubmitting ? "Guardando…" : editing ? "Actualizar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
