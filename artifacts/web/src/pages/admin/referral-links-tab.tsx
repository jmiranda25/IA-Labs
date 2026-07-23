import { useState } from "react";
import { apiUrl } from "@/lib/api-base";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Link2, Copy, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ── Referral Links Tab ────────────────────────────────────────────────────────

export default function ReferralLinksTab() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("");

  async function authFetch(url: string, opts: RequestInit = {}) {
    const token = await getToken();
    return fetch(apiUrl(url), {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(opts.headers ?? {}),
      },
    });
  }

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/referrals");
      if (!res.ok) throw new Error("Failed to fetch referrals");
      return res.json() as Promise<any[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/admin/referrals", {
        method: "POST",
        body: JSON.stringify({
          label: label.trim() || undefined,
          maxUses: maxUses ? Number(maxUses) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create referral link");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-referrals"] });
      setCreateOpen(false);
      setLabel("");
      setMaxUses("");
      toast.success("Link de referido creado");
    },
    onError: () => toast.error("Error al crear el link"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ code, isActive }: { code: string; isActive: boolean }) => {
      const res = await authFetch(`/api/admin/referrals/${code}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-referrals"] }),
    onError: () => toast.error("Error al actualizar el link"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await authFetch(`/api/admin/referrals/${code}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-referrals"] });
      toast.success("Link eliminado");
    },
    onError: () => toast.error("Error al eliminar el link"),
  });

  function copyLink(code: string) {
    const url = `${window.location.origin}/registro?ref=${code}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copiado al portapapeles"));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Links de Referido</h2>
          <p className="text-sm text-muted-foreground">
            Genera links únicos para invitar personas a la comunidad.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />Crear link
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : links.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <Link2 className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p>No hay links de referido aún.</p>
            <p className="text-xs mt-1">Crea el primero para empezar a invitar personas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {links.map((link: any) => (
            <Card key={link.id} className={!link.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded select-all">
                      {link.code}
                    </code>
                    {link.label && (
                      <span className="text-sm font-medium truncate">{link.label}</span>
                    )}
                    <Badge variant={link.isActive ? "default" : "secondary"} className="text-xs">
                      {link.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span className="font-medium text-foreground/70">
                      {link.usesCount}
                      {link.maxUses != null ? ` / ${link.maxUses}` : ""} usos
                    </span>
                    <span>Creado por: {link.createdByName ?? link.createdByUsername ?? "—"}</span>
                    <span>{new Date(link.createdAt).toLocaleDateString("es-ES")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate font-mono opacity-70">
                    {window.location.origin}/registro?ref={link.code}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => copyLink(link.code)}
                  >
                    <Copy className="h-3.5 w-3.5" />Copiar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    disabled={toggleMutation.isPending}
                    onClick={() => toggleMutation.mutate({ code: link.code, isActive: !link.isActive })}
                  >
                    {link.isActive ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label="Eliminar link"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(link.code)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Nuevo link de referido
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ref-label">Etiqueta <span className="text-muted-foreground">(opcional)</span></Label>
              <Input
                id="ref-label"
                placeholder="Ej: Campaña Instagram, Evento mayo…"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-max">Máximo de usos <span className="text-muted-foreground">(opcional)</span></Label>
              <Input
                id="ref-max"
                type="number"
                min={1}
                placeholder="Sin límite"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? "Creando…" : "Crear link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
