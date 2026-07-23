import { useState } from "react";
import { apiUrl } from "@/lib/api-base";
import { getGetAdminMetricsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ── Pending Member Approval Tab ───────────────────────────────────────────────

export default function PendingUsersTab() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; displayName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-pending-users"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/users/pending");
      if (!res.ok) throw new Error("Error al cargar solicitudes");
      return res.json() as Promise<{ users: any[] }>;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await authFetch(`/api/admin/users/${userId}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Error al aprobar");
      return res.json();
    },
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: getGetAdminMetricsQueryKey() });
      toast.success("Usuario aprobado");
    },
    onError: () => toast.error("Error al aprobar el usuario"),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const res = await authFetch(`/api/admin/users/${userId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Error al rechazar");
      return res.json();
    },
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: getGetAdminMetricsQueryKey() });
      toast.success("Solicitud rechazada");
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectReason("");
    },
    onError: () => toast.error("Error al rechazar la solicitud"),
  });

  const users: any[] = data?.users ?? [];

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Check className="h-12 w-12 mx-auto mb-3 text-green-400 opacity-50" />
        <p className="font-medium">Sin solicitudes pendientes</p>
        <p className="text-sm mt-1">Todos los usuarios han sido revisados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((u: any) => (
        <Card key={u.id}>
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={u.avatarUrl} />
              <AvatarFallback className="text-sm">{u.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{u.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email ?? "Sin email"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Registrado: {new Date(u.joinedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-green-600 hover:bg-green-500 text-white border-0"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate(u.id)}
              >
                <Check className="h-3.5 w-3.5" />
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 gap-1.5"
                onClick={() => { setRejectTarget({ id: u.id, displayName: u.displayName }); setRejectReason(""); setRejectOpen(true); }}
              >
                <X className="h-3.5 w-3.5" />
                Rechazar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={rejectOpen} onOpenChange={(o) => { setRejectOpen(o); if (!o) setRejectTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Rechazar a <strong>{rejectTarget?.displayName}</strong>? Indica el motivo.
          </p>
          <Textarea
            placeholder="Motivo del rechazo..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => rejectTarget && rejectMutation.mutate({ userId: rejectTarget.id, reason: rejectReason })}
            >
              {rejectMutation.isPending ? "Rechazando…" : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
