import { useState } from "react";
import {
  useGetModerationQueue,
  useAdminResolveReport,
  getGetModerationQueueQueryKey,
  useAdminPublishResource,
  useAdminRejectResource,
  useAdminApproveMarketplaceListing,
  useAdminRejectMarketplaceListing,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Check, X, ShoppingBag, BookOpen, Flag, Eye, ExternalLink, Trash2,
} from "lucide-react";

// ── Moderation (unified queue) ────────────────────────────────────────────────

export default function ModerationQueue() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetModerationQueue({ query: { queryKey: getGetModerationQueueQueryKey() } });
  const resolveReport = useAdminResolveReport();
  const approveListing = useAdminApproveMarketplaceListing();
  const rejectListing = useAdminRejectMarketplaceListing();
  const publishResource = useAdminPublishResource();
  const rejectResource = useAdminRejectResource();

  const queue = data as any;
  const listings: any[] = queue?.listings ?? [];
  const resources: any[] = queue?.resources ?? [];
  const reports: any[] = queue?.reports ?? [];

  const [preview, setPreview] = useState<{ type: string; item: any } | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ type: "listing" | "resource"; slug: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const totalPending = listings.length + resources.length + reports.length;

  const handleRejectOpen = (type: "listing" | "resource", slug: string) => {
    setRejectTarget({ type, slug });
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      if (rejectTarget.type === "listing") {
        await rejectListing.mutateAsync({ slug: rejectTarget.slug, data: { reason: rejectReason } });
      } else {
        await rejectResource.mutateAsync({ slug: rejectTarget.slug, data: { reason: rejectReason } });
      }
      qc.invalidateQueries({ queryKey: getGetModerationQueueQueryKey() });
      toast.success("Rechazado correctamente");
      setRejectOpen(false);
      if (preview?.item?.slug === rejectTarget.slug) setPreview(null);
    } catch { toast.error("Error al rechazar"); }
  };

  const handleApprove = async (type: "listing" | "resource", slug: string) => {
    try {
      if (type === "listing") {
        await approveListing.mutateAsync({ slug });
        toast.success("Anuncio aprobado");
      } else {
        await publishResource.mutateAsync({ slug });
        toast.success("Recurso publicado");
      }
      qc.invalidateQueries({ queryKey: getGetModerationQueueQueryKey() });
      if (preview?.item?.slug === slug) setPreview(null);
    } catch { toast.error("Error al aprobar"); }
  };

  const handleResolveReport = async (reportId: string, action: "remove" | "dismiss") => {
    try {
      await resolveReport.mutateAsync({ reportId, data: { action } });
      qc.invalidateQueries({ queryKey: getGetModerationQueueQueryKey() });
      toast.success(action === "remove" ? "Contenido eliminado" : "Reporte descartado");
    } catch { toast.error("Error al resolver el reporte"); }
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  if (totalPending === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Check className="h-12 w-12 mx-auto mb-3 text-green-400 opacity-50" />
        <p className="font-medium">Cola limpia</p>
        <p className="text-sm mt-1">No hay elementos pendientes de moderación.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={listings.length > 0 ? "listings" : resources.length > 0 ? "resources" : "reports"}>
        <TabsList>
          <TabsTrigger value="listings" className="gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" />
            Listings
            {listings.length > 0 && <Badge variant="secondary" className="text-[10px] ml-1">{listings.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Recursos
            {resources.length > 0 && <Badge variant="secondary" className="text-[10px] ml-1">{resources.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <Flag className="h-3.5 w-3.5" />
            Reportes
            {reports.length > 0 && <Badge variant="destructive" className="text-[10px] ml-1">{reports.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Listings tab */}
        <TabsContent value="listings" className="mt-4">
          {listings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No hay listings pendientes.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                {listings.map((l: any) => (
                  <Card
                    key={l.id}
                    className={`cursor-pointer transition-colors ${preview?.item?.id === l.id ? "border-primary/50 bg-primary/5" : "hover:border-border/80"}`}
                    onClick={() => setPreview(preview?.item?.id === l.id ? null : { type: "listing", item: l })}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {l.images?.[0]?.url
                          ? <img src={l.images[0].url} alt={l.title} className="w-full h-full object-cover" />
                          : <ShoppingBag className="h-4 w-4 text-muted-foreground/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{l.title}</p>
                        <p className="text-xs text-muted-foreground">{l.category} · {l.sellerName}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs"
                          onClick={(e) => { e.stopPropagation(); handleApprove("listing", l.slug); }}>
                          <Check className="h-3 w-3 mr-1" />Aprobar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                          onClick={(e) => { e.stopPropagation(); handleRejectOpen("listing", l.slug); }}>
                          <X className="h-3 w-3 mr-1" />Rechazar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {preview?.type === "listing" && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-primary" />Vista previa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {preview.item.images?.[0]?.url && <img src={preview.item.images[0].url} alt={preview.item.title} className="w-full h-40 object-cover rounded-lg" />}
                    <Badge variant="secondary">{preview.item.category}</Badge>
                    {preview.item.price != null && <p className="font-semibold text-primary">S/ {Number(preview.item.price).toLocaleString("es")}</p>}
                    <p className="text-xs text-muted-foreground line-clamp-5">{preview.item.description}</p>
                    <p className="text-xs">Vendedor: {preview.item.sellerName}</p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="bg-green-600 hover:bg-green-500 gap-1" onClick={() => handleApprove("listing", preview.item.slug)}>
                        <Check className="h-3 w-3" />Aprobar
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleRejectOpen("listing", preview.item.slug)}>
                        <X className="h-3 w-3" />Rechazar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Resources tab */}
        <TabsContent value="resources" className="mt-4">
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No hay recursos pendientes.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                {resources.map((r: any) => (
                  <Card
                    key={r.id}
                    className={`cursor-pointer transition-colors ${preview?.item?.id === r.id ? "border-primary/50 bg-primary/5" : "hover:border-border/80"}`}
                    onClick={() => setPreview(preview?.item?.id === r.id ? null : { type: "resource", item: r })}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.type} · {r.authorName}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs"
                          onClick={(e) => { e.stopPropagation(); handleApprove("resource", r.slug); }}>
                          <Check className="h-3 w-3 mr-1" />Aprobar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                          onClick={(e) => { e.stopPropagation(); handleRejectOpen("resource", r.slug); }}>
                          <X className="h-3 w-3 mr-1" />Rechazar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {preview?.type === "resource" && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-primary" />Vista previa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="font-semibold">{preview.item.title}</p>
                    <Badge variant="outline" className="text-xs">{preview.item.type}</Badge>
                    <p className="text-xs text-muted-foreground line-clamp-6">{preview.item.description}</p>
                    {(preview.item.url || preview.item.filePath) && (
                      <a href={preview.item.url || preview.item.filePath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" />Abrir enlace
                      </a>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="bg-green-600 hover:bg-green-500 gap-1" onClick={() => handleApprove("resource", preview.item.slug)}>
                        <Check className="h-3 w-3" />Aprobar
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleRejectOpen("resource", preview.item.slug)}>
                        <X className="h-3 w-3" />Rechazar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Reports tab */}
        <TabsContent value="reports" className="mt-4">
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No hay reportes abiertos.</p>
          ) : (
            <div className="space-y-2">
              {reports.map((r: any) => (
                <Card key={r.id} className="border-yellow-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Flag className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-semibold capitalize">{r.targetType.replace("_", " ")} reportado</span>
                          <Badge variant="outline" className="text-[10px]">#{r.targetId.slice(0, 8)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Motivo: {r.reason}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(r.createdAt).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => handleResolveReport(r.id, "dismiss")}>
                          <Check className="h-3 w-3" />Descartar
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 gap-1" onClick={() => handleResolveReport(r.id, "remove")}>
                          <Trash2 className="h-3 w-3" />Eliminar contenido
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject reason dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rechazar {rejectTarget?.type === "listing" ? "anuncio" : "recurso"}</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Motivo del rechazo..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={handleRejectConfirm}>Rechazar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
