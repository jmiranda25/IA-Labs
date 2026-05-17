import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  useGetMe,
  useGetAdminMetrics,
  getGetAdminMetricsQueryKey,
  useAdminListUsers,
  useAdminUpdateUserRole,
  useAdminDisableUser,
  useGetModerationQueue,
  useAdminResolveReport,
  getAdminListUsersQueryKey,
  getGetModerationQueueQueryKey,
  getAdminListEventsQueryKey,
  getAdminListResourcesQueryKey,
  getAdminListMarketplaceListingsQueryKey,
  useAdminListEvents,
  useAdminCreateEvent,
  useAdminUpdateEvent,
  useAdminDeleteEvent,
  useAdminUploadEventCover,
  useAdminListResources,
  useAdminPublishResource,
  useAdminRejectResource,
  useAdminListMarketplaceListings,
  useAdminApproveMarketplaceListing,
  useAdminRejectMarketplaceListing,
} from "@workspace/api-client-react";
import type {
  CourseDetail,
  CourseModule,
  AdminCoursePurchase,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Redirect } from "wouter";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Shield, Users, AlertTriangle, BarChart3, Edit3, Check, X,
  Calendar, Plus, Trash2, Upload, BookOpen, Link2, FileDown,
  GraduationCap, ExternalLink, Eye, ShoppingBag, TrendingUp,
  TrendingDown, Minus, Flag, MessageSquare, UserX, Copy, Award,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { useAuth } from "@clerk/react";
import { useLocation, useSearch } from "wouter";
import { LandingEditor } from "@/components/admin/landing-editor";
import { useViewMode } from "@/contexts/view-mode";

// ── KPI Dashboard ─────────────────────────────────────────────────────────────

function spark(trend: number) {
  const base = 20;
  return Array.from({ length: 8 }, (_, i) => ({
    v: Math.max(0, base + Math.round(Math.sin(i + trend) * 8 + Math.random() * 4)),
  }));
}

interface KpiCardProps {
  label: string;
  value: number | string;
  growth?: number;
  sparkData?: { v: number }[];
  color?: string;
  alert?: boolean;
  onClick?: () => void;
}

function KpiCard({ label, value, growth, sparkData, color = "#6366f1", alert, onClick }: KpiCardProps) {
  return (
    <Card
      onClick={onClick}
      className={`relative overflow-hidden transition-all ${onClick ? "cursor-pointer hover:border-primary/60" : ""} ${alert ? "border-destructive/40" : ""}`}
    >
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold tabular-nums ${alert ? "text-destructive" : ""}`}>{value}</p>
        {growth !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${growth > 0 ? "text-green-400" : growth < 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {growth > 0 ? <TrendingUp className="h-3 w-3" /> : growth < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {growth > 0 ? "+" : ""}{growth}% últimos 30 días
          </div>
        )}
        {sparkData && (
          <div className="absolute bottom-0 right-0 w-24 h-10 opacity-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Area type="monotone" dataKey="v" stroke={color} fill={color} strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PendingBadge() {
  const { data: metrics } = useGetAdminMetrics({ query: { queryKey: getGetAdminMetricsQueryKey() } });
  const count = (metrics as any)?.pendingUsers ?? 0;
  if (!count) return null;
  return (
    <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-purple-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function AdminDashboard({ onDrillDown }: { onDrillDown: (tab: string) => void }) {
  const { data: metrics, isLoading } = useGetAdminMetrics({ query: { queryKey: getGetAdminMetricsQueryKey() } });
  const m = metrics as any;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
  }

  const cards = [
    { label: "Total Miembros", value: m?.totalMembers ?? 0, growth: m?.members30dGrowth, sparkData: spark(1), tab: "users" },
    { label: "Solicitudes pendientes", value: m?.pendingUsers ?? 0, sparkData: spark(7), color: "#a855f7", alert: (m?.pendingUsers ?? 0) > 0, tab: "pendientes" },
    { label: "Eventos próximos", value: m?.upcomingEvents ?? 0, sparkData: spark(2), color: "#f97316", tab: "eventos" },
    { label: "Hilos activos (7d)", value: m?.activeThreads7d ?? 0, sparkData: spark(3), color: "#22c55e", tab: null },
    { label: "Listings pendientes", value: m?.pendingListings ?? 0, sparkData: spark(4), color: "#eab308", alert: (m?.pendingListings ?? 0) > 0, tab: "moderacion" },
    { label: "Recursos pendientes", value: m?.pendingResources ?? 0, sparkData: spark(5), color: "#eab308", alert: (m?.pendingResources ?? 0) > 0, tab: "moderacion" },
    { label: "Reportes abiertos", value: m?.openReports ?? 0, sparkData: spark(6), color: "#ef4444", alert: (m?.openReports ?? 0) > 0, tab: "moderacion" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Haz clic en una tarjeta para ir a esa sección.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        {cards.map(({ label, value, growth, sparkData, color, alert, tab }) => (
          <KpiCard
            key={label}
            label={label}
            value={value}
            growth={growth}
            sparkData={sparkData}
            color={color}
            alert={alert}
            onClick={tab ? () => onDrillDown(tab) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// ── User Management (TanStack Table) ─────────────────────────────────────────

function UserManagement() {
  const { userId: currentUserId } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [confirmRole, setConfirmRole] = useState<{ userId: string; displayName: string; newRole: string } | null>(null);
  const [confirmDisable, setConfirmDisable] = useState<{ userId: string; displayName: string } | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const params = {
    q: search || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    cursor,
    limit: 50,
  };

  const { data, isLoading } = useAdminListUsers(params, {
    query: { queryKey: getAdminListUsersQueryKey(params) },
  });

  const updateRole = useAdminUpdateUserRole();
  const disableUser = useAdminDisableUser();

  const users = (data as any)?.users ?? [];
  const nextCursor = (data as any)?.nextCursor;

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "displayName",
      header: "Usuario",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={row.original.avatarUrl} />
            <AvatarFallback className="text-[10px]">{row.original.displayName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{row.original.displayName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{row.original.clerkId}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Rol",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant={row.original.role === "administrator" ? "default" : "secondary"} className="text-[10px]">
            {row.original.role}
          </Badge>
          {row.original.isBanned && <Badge variant="destructive" className="text-[10px]">Baneado</Badge>}
          {row.original.disabledAt && <Badge variant="outline" className="text-[10px] text-muted-foreground">Desactivado</Badge>}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const u = row.original;
        const isDisabled = !!u.disabledAt;
        const isSelf = u.clerkId === currentUserId;
        const newRole = u.role === "administrator" ? "participant" : "administrator";
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setConfirmRole({ userId: u.clerkId, displayName: u.displayName, newRole })}
              data-testid={`btn-toggle-role-${u.id}`}
              disabled={isSelf}
              title={isSelf ? "No puedes modificar tu propio rol" : undefined}
            >
              {u.role === "administrator" ? "→ Participante" : "→ Admin"}
            </Button>
            {!isDisabled && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDisable({ userId: u.clerkId, displayName: u.displayName })}
                data-testid={`btn-disable-${u.id}`}
                disabled={isSelf}
                title={isSelf ? "No puedes desactivar tu propia cuenta" : undefined}
              >
                <UserX className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleConfirmRole = () => {
    if (!confirmRole) return;
    updateRole.mutate(
      { userId: confirmRole.userId, data: { role: confirmRole.newRole as "participant" | "administrator" } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) });
          toast.success(`Rol actualizado a ${confirmRole.newRole}`);
          setConfirmRole(null);
        },
        onError: () => { toast.error("Error al actualizar el rol"); setConfirmRole(null); },
      }
    );
  };

  const handleConfirmDisable = () => {
    if (!confirmDisable) return;
    disableUser.mutate(
      { userId: confirmDisable.userId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) });
          toast.success("Usuario desactivado");
          setConfirmDisable(null);
        },
        onError: () => { toast.error("Error al desactivar"); setConfirmDisable(null); },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCursor(undefined); }}
          className="max-w-xs"
          data-testid="input-admin-user-search"
        />
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCursor(undefined); }}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="participant">Participante</SelectItem>
            <SelectItem value="administrator">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-muted/40 border-b border-border">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/50">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20 transition-colors" data-testid={`admin-user-row-${row.original.id}`}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-10 text-sm text-muted-foreground">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {nextCursor && (
        <Button variant="outline" size="sm" onClick={() => setCursor(nextCursor)}>
          Cargar más
        </Button>
      )}

      {/* Role confirm dialog */}
      <AlertDialog open={!!confirmRole} onOpenChange={(o) => !o && setConfirmRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar rol</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cambiar el rol de <strong>{confirmRole?.displayName}</strong> a{" "}
              <strong>{confirmRole?.newRole}</strong>? Esto también actualizará los permisos en tiempo real.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRole} disabled={updateRole.isPending}>
              {updateRole.isPending ? "Actualizando…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable confirm dialog */}
      <AlertDialog open={!!confirmDisable} onOpenChange={(o) => !o && setConfirmDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar cuenta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desactivar la cuenta de <strong>{confirmDisable?.displayName}</strong>? El usuario no podrá iniciar sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDisable}
              disabled={disableUser.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {disableUser.isPending ? "Desactivando…" : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Moderation (unified queue) ────────────────────────────────────────────────

function ModerationQueue() {
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
                    {preview.item.price != null && <p className="font-semibold text-primary">{preview.item.currency} {Number(preview.item.price).toLocaleString("es")}</p>}
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

// ── Resources Admin ───────────────────────────────────────────────────────────

function ResourcesAdmin() {
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

// ── Marketplace Admin ─────────────────────────────────────────────────────────

function MarketplaceAdmin() {
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
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{l.title}</p><p className="text-xs text-muted-foreground">{l.category} · {l.sellerName}{l.price != null && ` · ${l.currency} ${Number(l.price).toLocaleString("es")}`}</p></div>
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
              {preview.price != null && <p className="font-semibold text-primary">{preview.currency} {Number(preview.price).toLocaleString("es")}</p>}
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

// ── Pending Member Approval Tab ───────────────────────────────────────────────

function PendingUsersTab() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; displayName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function authFetch(url: string, opts: RequestInit = {}) {
    const token = await getToken();
    return fetch(url, {
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

// ── Referral Links Tab ────────────────────────────────────────────────────────

function ReferralLinksTab() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("");

  async function authFetch(url: string, opts: RequestInit = {}) {
    const token = await getToken();
    return fetch(url, {
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

// ── Courses Admin ─────────────────────────────────────────────────────────────

function CoursesAdmin() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  async function authFetch(url: string, opts: RequestInit = {}) {
    const token = await getToken();
    return fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(opts.headers ?? {}),
      },
    });
  }

  // ── Courses CRUD state ───
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseDetail | null>(null);
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null);
  const [coverUploadId, setCoverUploadId] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  // ── Module state ───
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleCourseId, setModuleCourseId] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  // ── Purchases state ───
  const [rejectPurchaseId, setRejectPurchaseId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"courses" | "purchases">("purchases");

  // ── Data fetches ───
  const { data: coursesRaw = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/courses");
      if (!res.ok) throw new Error("Error al cargar cursos");
      return res.json() as Promise<CourseDetail[]>;
    },
  });
  const courses: CourseDetail[] = coursesRaw;

  const { data: purchasesRaw = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ["admin-course-purchases"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/courses/purchases");
      if (!res.ok) throw new Error("Error al cargar compras");
      return res.json() as Promise<AdminCoursePurchase[]>;
    },
  });
  const purchases: AdminCoursePurchase[] = purchasesRaw;

  // ── Course form ───
  const courseSchema = z.object({
    title: z.string().min(3, "Mínimo 3 caracteres"),
    description: z.string().optional(),
    pricePen: z.string().min(1, "Precio requerido"),
    status: z.enum(["draft", "published"]),
  });
  type CourseFormValues = z.infer<typeof courseSchema>;

  const courseForm = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: { title: "", description: "", pricePen: "", status: "draft" },
  });

  function openCourseDialog(course?: CourseDetail) {
    if (course) {
      setEditingCourse(course);
      courseForm.reset({
        title: course.title,
        description: course.description ?? "",
        pricePen: String(course.pricePen),
        status: course.status,
      });
    } else {
      setEditingCourse(null);
      courseForm.reset({ title: "", description: "", pricePen: "", status: "draft" });
    }
    setCourseDialogOpen(true);
  }

  const courseMutation = useMutation({
    mutationFn: async (data: CourseFormValues) => {
      if (editingCourse) {
        const res = await authFetch(`/api/admin/courses/${editingCourse.id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Error al actualizar");
        return res.json();
      } else {
        const res = await authFetch("/api/admin/courses", {
          method: "POST",
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Error al crear");
        return res.json();
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success(editingCourse ? "Curso actualizado" : "Curso creado");
      setCourseDialogOpen(false);
    },
    onError: () => toast.error("Error al guardar curso"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/admin/courses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Curso eliminado");
      setDeleteCourseId(null);
    },
    onError: () => toast.error("Error al eliminar"),
  });

  async function handleCoverUpload() {
    if (!coverUploadId || !coverFile) return;
    setCoverUploading(true);
    try {
      const token = await getToken();
      const fd = new FormData();
      fd.append("cover", coverFile);
      const res = await fetch(`/api/admin/courses/${coverUploadId}/cover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Error al subir portada");
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Portada actualizada");
      setCoverUploadId(null);
      setCoverFile(null);
    } catch {
      toast.error("Error al subir portada");
    } finally {
      setCoverUploading(false);
    }
  }

  // ── Module form ───
  const moduleSchema = z.object({
    title: z.string().min(2, "Mínimo 2 caracteres"),
    description: z.string().optional(),
    videoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  });
  type ModuleFormValues = z.infer<typeof moduleSchema>;

  const moduleForm = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { title: "", description: "", videoUrl: "" },
  });

  function openModuleDialog(courseId: string, module?: CourseModule) {
    setModuleCourseId(courseId);
    if (module) {
      setEditingModule(module);
      moduleForm.reset({
        title: module.title,
        description: module.description ?? "",
        videoUrl: module.videoUrl ?? "",
      });
    } else {
      setEditingModule(null);
      moduleForm.reset({ title: "", description: "", videoUrl: "" });
    }
    setModuleDialogOpen(true);
  }

  const moduleMutation = useMutation({
    mutationFn: async (data: ModuleFormValues) => {
      const payload = { ...data, videoUrl: data.videoUrl || null };
      if (editingModule) {
        const res = await authFetch(`/api/admin/courses/modules/${editingModule.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al actualizar módulo");
        return res.json();
      } else {
        const res = await authFetch(`/api/admin/courses/${moduleCourseId}/modules`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al crear módulo");
        return res.json();
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success(editingModule ? "Módulo actualizado" : "Módulo creado");
      setModuleDialogOpen(false);
    },
    onError: () => toast.error("Error al guardar módulo"),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const res = await authFetch(`/api/admin/courses/modules/${moduleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Módulo eliminado");
    },
    onError: () => toast.error("Error al eliminar módulo"),
  });

  const reorderModuleMutation = useMutation({
    mutationFn: async ({ moduleId, orderIndex }: { moduleId: string; orderIndex: number }) => {
      const res = await authFetch(`/api/admin/courses/modules/${moduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ orderIndex }),
      });
      if (!res.ok) throw new Error("Error al reordenar");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
    },
    onError: () => toast.error("Error al reordenar módulo"),
  });

  async function handleMoveModule(course: CourseDetail, moduleIndex: number, direction: "up" | "down") {
    const modules: CourseModule[] = [...course.modules].sort((a: CourseModule, b: CourseModule) => a.orderIndex - b.orderIndex);
    const targetIndex = direction === "up" ? moduleIndex - 1 : moduleIndex + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;
    const current = modules[moduleIndex];
    const target = modules[targetIndex];
    await Promise.all([
      reorderModuleMutation.mutateAsync({ moduleId: current.id, orderIndex: target.orderIndex }),
      reorderModuleMutation.mutateAsync({ moduleId: target.id, orderIndex: current.orderIndex }),
    ]);
  }

  // ── Purchase actions ───
  const approvePurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/admin/courses/purchases/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Error al aprobar");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-course-purchases"] });
      toast.success("Acceso aprobado y usuario notificado");
    },
    onError: () => toast.error("Error al aprobar"),
  });

  const rejectPurchaseMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await authFetch(`/api/admin/courses/purchases/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Error al rechazar");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-course-purchases"] });
      toast.success("Solicitud rechazada");
      setRejectOpen(false);
      setRejectPurchaseId(null);
      setRejectReason("");
    },
    onError: () => toast.error("Error al rechazar"),
  });

  return (
    <div className="space-y-6">
      {/* Section toggle */}
      <div className="flex gap-2 border-b border-border pb-4">
        <Button
          variant={activeSection === "purchases" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSection("purchases")}
        >
          Solicitudes de compra
          {purchases.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-white/20 text-[10px] font-bold">
              {purchases.length}
            </span>
          )}
        </Button>
        <Button
          variant={activeSection === "courses" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveSection("courses")}
        >
          Gestionar cursos
        </Button>
      </div>

      {/* ── Pending purchases ── */}
      {activeSection === "purchases" && (
        <div className="space-y-3">
          {purchasesLoading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : purchases.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay solicitudes de compra pendientes.</p>
            </div>
          ) : (
            purchases.map((p: AdminCoursePurchase) => (
              <Card key={p.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={p.buyerAvatar ?? undefined} />
                    <AvatarFallback className="text-xs">{p.buyerName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium truncate">{p.buyerName}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.buyerEmail}</p>
                    <p className="text-xs text-primary font-medium">{p.courseTitle} · S/ {Number(p.pricePen).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      Código Yape: <span className="font-mono font-bold text-foreground">{p.yapeOperationCode}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 bg-green-600 hover:bg-green-500 text-white border-0"
                      disabled={approvePurchaseMutation.isPending}
                      onClick={() => approvePurchaseMutation.mutate(p.id)}
                    >
                      <Check className="h-3.5 w-3.5" />Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 gap-1.5"
                      onClick={() => { setRejectPurchaseId(p.id); setRejectReason(""); setRejectOpen(true); }}
                    >
                      <X className="h-3.5 w-3.5" />Rechazar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Course management ── */}
      {activeSection === "courses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{courses.length} curso{courses.length !== 1 ? "s" : ""} en total</p>
            <Button size="sm" className="gap-1.5" onClick={() => openCourseDialog()}>
              <Plus className="h-4 w-4" />Nuevo curso
            </Button>
          </div>

          {coursesLoading ? (
            <Skeleton className="h-32 rounded-xl" />
          ) : courses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sin cursos. Crea el primero.</p>
            </div>
          ) : (
            courses.map((c: CourseDetail) => (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {c.coverUrl ? (
                      <img src={c.coverUrl} alt={c.title} className="h-14 w-20 object-cover rounded-md shrink-0" />
                    ) : (
                      <div className="h-14 w-20 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <GraduationCap className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{c.title}</p>
                        <Badge variant={c.status === "published" ? "default" : "secondary"} className="text-xs">
                          {c.status === "published" ? "Publicado" : "Borrador"}
                        </Badge>
                        <span className="text-xs text-primary font-medium">S/ {Number(c.pricePen).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.moduleCount} módulo{c.moduleCount !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Subir portada"
                        onClick={() => { setCoverUploadId(c.id); setCoverFile(null); }}
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Editar curso"
                        onClick={() => openCourseDialog(c)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label="Eliminar curso"
                        onClick={() => setDeleteCourseId(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2"
                        onClick={() => setExpandedCourse(expandedCourse === c.id ? null : c.id)}
                      >
                        {expandedCourse === c.id ? "Ocultar" : "Módulos"}
                      </Button>
                    </div>
                  </div>

                  {/* Modules list */}
                  {expandedCourse === c.id && (
                    <div className="mt-4 space-y-2 border-t border-border pt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Módulos</p>
                        <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" onClick={() => openModuleDialog(c.id)}>
                          <Plus className="h-3 w-3" />Agregar
                        </Button>
                      </div>
                      {c.modules.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sin módulos todavía.</p>
                      ) : (
                        [...c.modules].sort((a: CourseModule, b: CourseModule) => a.orderIndex - b.orderIndex).map((m: CourseModule, i: number, arr: CourseModule[]) => (
                          <div key={m.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                            <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{m.title}</p>
                              {m.videoUrl && <p className="text-xs text-muted-foreground/60 truncate">{m.videoUrl}</p>}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                aria-label="Subir módulo"
                                disabled={i === 0 || reorderModuleMutation.isPending}
                                onClick={() => handleMoveModule(c, i, "up")}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                aria-label="Bajar módulo"
                                disabled={i === arr.length - 1 || reorderModuleMutation.isPending}
                                onClick={() => handleMoveModule(c, i, "down")}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Editar módulo" onClick={() => openModuleDialog(c.id, m)}>
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                aria-label="Eliminar módulo"
                                onClick={() => deleteModuleMutation.mutate(m.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Course dialog ── */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Editar curso" : "Nuevo curso"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={courseForm.handleSubmit((d) => courseMutation.mutate(d))} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-title">Título *</Label>
              <Input id="c-title" {...courseForm.register("title")} placeholder="Ej. Introducción a LLMs" />
              {courseForm.formState.errors.title && <p className="text-xs text-destructive">{courseForm.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Descripción (Markdown)</Label>
              <Textarea id="c-desc" {...courseForm.register("description")} rows={4} placeholder="Descripción del curso…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-price">Precio (S/ soles) *</Label>
                <Input id="c-price" {...courseForm.register("pricePen")} placeholder="Ej. 49.90" type="number" step="0.01" min="0" />
                {courseForm.formState.errors.pricePen && <p className="text-xs text-destructive">{courseForm.formState.errors.pricePen.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-status">Estado</Label>
                <Select
                  value={courseForm.watch("status")}
                  onValueChange={(v) => courseForm.setValue("status", v as "draft" | "published")}
                >
                  <SelectTrigger id="c-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCourseDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={courseMutation.isPending}>
                {courseMutation.isPending ? "Guardando…" : editingCourse ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Cover upload dialog ── */}
      <Dialog open={!!coverUploadId} onOpenChange={(v) => { if (!v) setCoverUploadId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Subir portada</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
            {coverFile && <p className="text-xs text-muted-foreground">{coverFile.name}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCoverUploadId(null)}>Cancelar</Button>
            <Button disabled={!coverFile || coverUploading} onClick={handleCoverUpload}>
              {coverUploading ? "Subiendo…" : "Subir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Module dialog ── */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingModule ? "Editar módulo" : "Nuevo módulo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={moduleForm.handleSubmit((d) => moduleMutation.mutate(d))} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-title">Título *</Label>
              <Input id="m-title" {...moduleForm.register("title")} placeholder="Ej. Introducción al curso" />
              {moduleForm.formState.errors.title && <p className="text-xs text-destructive">{moduleForm.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-desc">Descripción</Label>
              <Textarea id="m-desc" {...moduleForm.register("description")} rows={2} placeholder="Descripción del módulo…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-video">URL del video (YouTube embed, Vimeo, etc.)</Label>
              <Input id="m-video" {...moduleForm.register("videoUrl")} placeholder="https://www.youtube.com/embed/..." />
              {moduleForm.formState.errors.videoUrl && <p className="text-xs text-destructive">{moduleForm.formState.errors.videoUrl.message}</p>}
              <p className="text-xs text-muted-foreground">Usa URLs de tipo embed para que se puedan reproducir directamente.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModuleDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={moduleMutation.isPending}>
                {moduleMutation.isPending ? "Guardando…" : editingModule ? "Actualizar" : "Crear módulo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Reject purchase dialog ── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rechazar solicitud</DialogTitle></DialogHeader>
          <Textarea
            placeholder="Motivo del rechazo (ej. código incorrecto, monto incorrecto)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectPurchaseMutation.isPending}
              onClick={() => rejectPurchaseId && rejectPurchaseMutation.mutate({ id: rejectPurchaseId, reason: rejectReason })}
            >
              {rejectPurchaseMutation.isPending ? "Rechazando..." : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete course confirm ── */}
      <AlertDialog open={!!deleteCourseId} onOpenChange={(v) => { if (!v) setDeleteCourseId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este curso?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminarán también todos sus módulos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteCourseId && deleteMutation.mutate(deleteCourseId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Admin Page ────────────────────────────────────────────────────────────────

const VALID_TABS = new Set([
  "dashboard", "pendientes", "users", "moderacion", "landing",
  "eventos", "recursos", "marketplace", "referidos", "cursos",
]);

export default function AdminPage() {
  const { data: me, isLoading } = useGetMe();
  const search = useSearch();
  const initialTab = (() => {
    const tab = new URLSearchParams(search).get("tab");
    return tab && VALID_TABS.has(tab) ? tab : "dashboard";
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const { viewAsUser, toggleViewMode } = useViewMode();
  const [, navigate] = useLocation();

  if (isLoading) return <Layout><Skeleton className="m-6 h-64 rounded-xl" /></Layout>;
  if ((me as any)?.role !== "administrator") return <Redirect to="/dashboard" />;

  const handleToggleUserView = () => {
    toggleViewMode();
    if (!viewAsUser) {
      navigate("/dashboard");
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />Centro de Control
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gestión de la comunidad, usuarios y moderación.</p>
          </div>
          <Button
            variant={viewAsUser ? "default" : "outline"}
            size="sm"
            onClick={handleToggleUserView}
            className={viewAsUser ? "bg-amber-500 hover:bg-amber-600 text-black border-0" : ""}
          >
            <Eye className="h-4 w-4 mr-1.5" />
            {viewAsUser ? "Salir del modo usuario" : "Ver como usuario"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" data-testid="tab-admin-dashboard"><BarChart3 className="h-4 w-4 mr-1.5" />Dashboard</TabsTrigger>
            <TabsTrigger value="pendientes" data-testid="tab-admin-pendientes" className="gap-1.5">
              <Users className="h-4 w-4" />
              Pendientes
              <PendingBadge />
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-admin-users"><Users className="h-4 w-4 mr-1.5" />Usuarios</TabsTrigger>
            <TabsTrigger value="moderacion" data-testid="tab-admin-moderation"><Flag className="h-4 w-4 mr-1.5" />Moderación</TabsTrigger>
            <TabsTrigger value="landing" data-testid="tab-admin-landing"><Edit3 className="h-4 w-4 mr-1.5" />Landing</TabsTrigger>
            <TabsTrigger value="eventos" data-testid="tab-admin-eventos"><Calendar className="h-4 w-4 mr-1.5" />Eventos</TabsTrigger>
            <TabsTrigger value="recursos" data-testid="tab-admin-recursos"><BookOpen className="h-4 w-4 mr-1.5" />Recursos</TabsTrigger>
            <TabsTrigger value="marketplace" data-testid="tab-admin-marketplace"><ShoppingBag className="h-4 w-4 mr-1.5" />Marketplace</TabsTrigger>
            <TabsTrigger value="referidos" data-testid="tab-admin-referidos"><Link2 className="h-4 w-4 mr-1.5" />Referidos</TabsTrigger>
            <TabsTrigger value="cursos" data-testid="tab-admin-cursos"><GraduationCap className="h-4 w-4 mr-1.5" />Cursos</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <AdminDashboard onDrillDown={setActiveTab} />
          </TabsContent>
          <TabsContent value="pendientes" className="mt-6">
            <PendingUsersTab />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>
          <TabsContent value="moderacion" className="mt-6">
            <ModerationQueue />
          </TabsContent>
          <TabsContent value="landing" className="mt-6">
            <LandingEditor />
          </TabsContent>
          <TabsContent value="eventos" className="mt-6">
            <EventosAdmin />
          </TabsContent>
          <TabsContent value="recursos" className="mt-6">
            <ResourcesAdmin />
          </TabsContent>
          <TabsContent value="marketplace" className="mt-6">
            <MarketplaceAdmin />
          </TabsContent>
          <TabsContent value="referidos" className="mt-6">
            <ReferralLinksTab />
          </TabsContent>
          <TabsContent value="cursos" className="mt-6">
            <CoursesAdmin />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
