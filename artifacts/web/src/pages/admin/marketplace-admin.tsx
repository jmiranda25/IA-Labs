import { useState } from "react";
import {
  useAdminListMarketplaceListings,
  getAdminListMarketplaceListingsQueryKey,
  useAdminApproveMarketplaceListing,
  useAdminRejectMarketplaceListing,
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
import { ShoppingBag, Check, X, Eye } from "lucide-react";

// ── Marketplace Admin ─────────────────────────────────────────────────────────

export default function MarketplaceAdmin() {
  const qc = useQueryClient();
  const { data: pendingRaw, isLoading } = useAdminListMarketplaceListings({ query: { queryKey: getAdminListMarketplaceListingsQueryKey() } });
  const pending = (pendingRaw as any[]) ?? [];
  const approveMutation = useAdminApproveMarketplaceListing();
  const rejectMutation = useAdminRejectMarketplaceListing();
  const [preview, setPreview] = useState<any>(null);
  const [rejectSlug, setRejectSlug] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  const handleApprove = async (slug: string) => {
    try { await approveMutation.mutateAsync({ slug }); qc.invalidateQueries({ queryKey: getAdminListMarketplaceListingsQueryKey() }); toast.success("Anuncio aprobado"); if (preview?.slug === slug) setPreview(null); }
    catch { toast.error("Error al aprobar"); }
  };

  const handleReject = async () => {
    if (!rejectSlug || !rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ slug: rejectSlug, data: { reason: rejectReason } });
      qc.invalidateQueries({ queryKey: getAdminListMarketplaceListingsQueryKey() });
      toast.success("Anuncio rechazado");
      setRejectOpen(false);
      if (preview?.slug === rejectSlug) setPreview(null);
    } catch { toast.error("Error al rechazar"); }
  };

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (pending.length === 0) return <div className="text-center py-12 text-muted-foreground"><ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No hay anuncios pendientes.</p></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{pending.length} anuncio{pending.length !== 1 ? "s" : ""} pendiente{pending.length !== 1 ? "s" : ""}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {pending.map((l: any) => (
            <Card key={l.id} className={`cursor-pointer transition-colors ${preview?.id === l.id ? "border-primary/50 bg-primary/5" : "hover:border-border/80"}`} onClick={() => setPreview(preview?.id === l.id ? null : l)}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {l.images?.[0]?.url ? <img src={l.images[0].url} alt={l.title} className="w-full h-full object-cover rounded-md" /> : <ShoppingBag className="h-4 w-4 text-muted-foreground/40" />}
                </div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{l.title}</p><p className="text-xs text-muted-foreground">{l.category} · {l.sellerName}{l.price != null && ` · S/ ${Number(l.price).toLocaleString("es")}`}</p></div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs" onClick={(e) => { e.stopPropagation(); handleApprove(l.slug); }}><Check className="h-3 w-3 mr-1" />Aprobar</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs" onClick={(e) => { e.stopPropagation(); setRejectSlug(l.slug); setRejectReason(""); setRejectOpen(true); }}><X className="h-3 w-3 mr-1" />Rechazar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {preview && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-primary" />Vista previa</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {preview.images?.length > 0 && <img src={preview.images[0].url} alt={preview.title} className="w-full h-40 object-cover rounded-lg" />}
              <Badge variant="secondary">{preview.category}</Badge>
              {preview.price != null && <p className="font-semibold text-primary">S/ {Number(preview.price).toLocaleString("es")}</p>}
              <p className="text-xs text-muted-foreground line-clamp-6">{preview.description}</p>
              <p className="text-xs">Vendedor: {preview.sellerName}</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="bg-green-600 hover:bg-green-500 gap-1" onClick={() => handleApprove(preview.slug)}><Check className="h-3 w-3" />Aprobar</Button>
                <Button size="sm" variant="destructive" className="gap-1" onClick={() => { setRejectSlug(preview.slug); setRejectReason(""); setRejectOpen(true); }}><X className="h-3 w-3" />Rechazar</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rechazar anuncio</DialogTitle></DialogHeader>
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
