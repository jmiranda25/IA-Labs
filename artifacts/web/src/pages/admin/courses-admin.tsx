import { useState } from "react";
import { apiUrl } from "@/lib/api-base";
import type { CourseDetail, CourseModule, AdminCoursePurchase } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Edit3, Check, X, Plus, Trash2, Upload, GraduationCap,
  ChevronUp, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ── Courses Admin ─────────────────────────────────────────────────────────────

export default function CoursesAdmin() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

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
    capacity: z.string().optional(),
    status: z.enum(["draft", "published"]),
  });
  type CourseFormValues = z.infer<typeof courseSchema>;

  const courseForm = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: { title: "", description: "", pricePen: "", capacity: "", status: "draft" },
  });

  function openCourseDialog(course?: CourseDetail) {
    if (course) {
      setEditingCourse(course);
      courseForm.reset({
        title: course.title,
        description: course.description ?? "",
        pricePen: String(course.pricePen),
        capacity: (course as any).capacity != null ? String((course as any).capacity) : "",
        status: course.status,
      });
    } else {
      setEditingCourse(null);
      courseForm.reset({ title: "", description: "", pricePen: "", capacity: "", status: "draft" });
    }
    setCourseDialogOpen(true);
  }

  const courseMutation = useMutation({
    mutationFn: async (data: CourseFormValues) => {
      const payload = {
        ...data,
        capacity: data.capacity && data.capacity.trim() !== "" ? parseInt(data.capacity, 10) : null,
      };
      if (editingCourse) {
        const res = await authFetch(`/api/admin/courses/${editingCourse.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Error al actualizar");
        return res.json();
      } else {
        const res = await authFetch("/api/admin/courses", {
          method: "POST",
          body: JSON.stringify(payload),
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
      const res = await fetch(apiUrl(`/api/admin/courses/${coverUploadId}/cover`), {
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
                        {(c as any).capacity != null && (
                          <span className="text-xs text-muted-foreground">{(c as any).capacity} cupos</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.moduleCount} módulo{c.moduleCount !== 1 ? "s" : ""}</p>
                      {(c as any).purchaseCounts && (
                        <div className="flex gap-2.5 mt-1.5 flex-wrap">
                          <span className="text-[11px] text-yellow-400/80"><span className="font-semibold">{(c as any).purchaseCounts.pending}</span> pendiente{(c as any).purchaseCounts.pending !== 1 ? "s" : ""}</span>
                          <span className="text-[11px] text-green-400/80"><span className="font-semibold">{(c as any).purchaseCounts.approved}</span> aprobado{(c as any).purchaseCounts.approved !== 1 ? "s" : ""}</span>
                          <span className="text-[11px] text-muted-foreground/60"><span className="font-semibold">{(c as any).purchaseCounts.rejected}</span> rechazado{(c as any).purchaseCounts.rejected !== 1 ? "s" : ""}</span>
                        </div>
                      )}
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
                <Label htmlFor="c-capacity">Cupos (vacío = ilimitado)</Label>
                <Input id="c-capacity" {...courseForm.register("capacity")} placeholder="Ej. 30" type="number" min="1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div></div>
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
