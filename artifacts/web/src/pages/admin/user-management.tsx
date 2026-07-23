import { useState, useMemo } from "react";
import {
  useAdminListUsers,
  useAdminUpdateUserRole,
  useAdminDisableUser,
  getAdminListUsersQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ── User Management (TanStack Table) ─────────────────────────────────────────

export default function UserManagement() {
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id;
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
        const isSelf = u.id === currentUserId;
        const newRole = u.role === "administrator" ? "participant" : "administrator";
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setConfirmRole({ userId: u.id, displayName: u.displayName, newRole })}
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
                onClick={() => setConfirmDisable({ userId: u.id, displayName: u.displayName })}
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
