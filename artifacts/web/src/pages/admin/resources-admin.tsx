import { useState } from "react";
import {
  useAdminListResources,
  getAdminListResourcesQueryKey,
  useAdminPublishResource,
  useAdminRejectResource,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Check, X, Eye, ExternalLink } from "lucide-react";

// ── Resources Admin ───────────────────────────────────────────────────────────

export default function ResourcesAdmin() {
  const qc = useQueryClient();
  const { data: pendingRaw, isLoading } = useAdminListResources({ query: { queryKey: getAdminListResourcesQueryKey() } });
  const pending = (pendingRaw as any[]) ?? [];
  const publishMutation = useAdminPublishResource();
  const rejectMutation = useAdminRejectResource();
  const [preview, setPreview] = useState<any>(null);
  const [rejectSlug, setRejectSlug] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  const handlePublish = async (slug: string) => {
    try { await publishMutation.mutateAsync({ slug }); qc.invalidateQueries({ queryKey: getAdminListResourcesQueryKey() }); toast.success("Recurso publicado"); }
    catch { toast.error("Error al publicar"); }
  };

  const handleReject = async () => {
    if (!rejectSlug || !rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ slug: rejectSlug, data: { reason: rejectReason } });
      qc.invalidateQueries({ queryKey: getAdminListResourcesQueryKey() });
      toast.success("Recurso rechazado");
      setRejectOpen(false);
      if (preview?.slug === rejectSlug) setPreview(null);
    } catch { toast.error("Error al rechazar"); }
  };

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (pending.length === 0) return <div className="text-center py-12 text-muted-foreground"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No hay recursos pendientes.</p></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{pending.length} recurso{pending.length !== 1 ? "s" : ""} en revisión</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {pending.map((r: any) => (
            <Card key={r.id} className={`cursor-pointer transition-colors ${preview?.id === r.id ? "border-primary/50 bg-primary/5" : "hover:border-border/80"}`} onClick={() => setPreview(preview?.id === r.id ? null : r)}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0"><BookOpen className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{r.title}</p><p className="text-xs text-muted-foreground">{r.type} · {r.authorName}</p></div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs" onClick={(e) => { e.stopPropagation(); handlePublish(r.slug); }}><Check className="h-3 w-3 mr-1" />Aprobar</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs" onClick={(e) => { e.stopPropagation(); setRejectSlug(r.slug); setRejectReason(""); setRejectOpen(true); }}><X className="h-3 w-3 mr-1" />Rechazar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {preview && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-primary" />{preview.title}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {preview.coverUrl && <img src={preview.coverUrl} alt={preview.title} className="w-full h-36 object-cover rounded-lg" />}
              <Badge variant="outline" className="text-xs">{preview.type}</Badge>
              <p className="text-xs text-muted-foreground line-clamp-6">{preview.description}</p>
              {(preview.url || preview.filePath) && <a href={preview.url || preview.filePath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" />Abrir enlace</a>}
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rechazar recurso</DialogTitle></DialogHeader>
          <Textarea placeholder="Motivo del rechazo..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || rejectMutation.isPending} onClick={handleReject}>{rejectMutation.isPending ? "Rechazando..." : "Rechazar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
