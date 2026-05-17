import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout";
import {
  useGetCourse,
  useSubmitCoursePurchase,
  useGetMe,
  getGetCourseQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  Lock,
  PlayCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Users,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import type { CourseDetail, CourseModule } from "@workspace/api-client-react";

const YAPE_NUMBER = "946323928";

const yapeSchema = z.object({
  yapeOperationCode: z
    .string()
    .min(4, "El código debe tener al menos 4 caracteres")
    .max(20, "El código es demasiado largo")
    .regex(/^\d+$/, "Solo se permiten números"),
});
type YapeFormValues = z.infer<typeof yapeSchema>;

interface YapeModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: CourseDetail;
  onSuccess: () => void;
}

function YapeModal({ open, onOpenChange, course, onSuccess }: YapeModalProps) {
  const mutation = useSubmitCoursePurchase();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<YapeFormValues>({
    resolver: zodResolver(yapeSchema),
    defaultValues: { yapeOperationCode: "" },
  });

  function onSubmit(values: YapeFormValues) {
    mutation.mutate(
      { slug: course.slug, data: { yapeOperationCode: values.yapeOperationCode } },
      {
        onSuccess: () => {
          toast.success("Solicitud enviada. El equipo validará tu pago pronto.");
          reset();
          onOpenChange(false);
          onSuccess();
        },
        onError: () => {
          toast.error("Error al enviar. Verifica el código e inténtalo de nuevo.");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comprar con Yape</DialogTitle>
          <DialogDescription>
            Envía el pago a nuestro número Yape y luego ingresa el código de operación para que validemos tu acceso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-2">
            {/* Yape info */}
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Datos para el pago</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Número Yape</span>
                <span className="font-mono font-bold text-foreground">{YAPE_NUMBER}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Monto exacto</span>
                <span className="font-bold text-primary text-base">S/ {Number(course.pricePen).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Concepto</span>
                <span className="text-foreground text-right max-w-[60%] truncate">{course.title}</span>
              </div>
            </div>

            <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-200 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Asegúrate de enviar el monto exacto. Una vez validado recibirás acceso inmediato.</span>
            </div>

            {/* Code input */}
            <div className="space-y-2">
              <Label htmlFor="yape-code">Código de operación Yape</Label>
              <Input
                id="yape-code"
                placeholder="Ej. 123456"
                {...register("yapeOperationCode")}
                autoFocus
                inputMode="numeric"
              />
              {errors.yapeOperationCode && (
                <p className="text-xs text-destructive">{errors.yapeOperationCode.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Lo encuentras en el comprobante de pago dentro de la app Yape.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Enviando…" : "Enviar solicitud"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ModuleRow({
  module,
  hasAccess,
  index,
}: {
  module: CourseModule;
  hasAccess: boolean;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => hasAccess && setExpanded(!expanded)}
        aria-label={`Módulo ${index + 1}: ${module.title}`}
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{module.title}</p>
          {module.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{module.description}</p>
          )}
        </div>
        {hasAccess ? (
          module.videoUrl ? (
            expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            )
          ) : (
            <span className="text-xs text-muted-foreground shrink-0">Sin video</span>
          )
        ) : (
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {hasAccess && expanded && module.videoUrl && (
        <div className="border-t border-border bg-black aspect-video">
          <iframe
            src={module.videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={module.title}
          />
        </div>
      )}
    </div>
  );
}

interface CursoDetalleProps {
  slug: string;
}

export default function CursoDetalle({ slug }: CursoDetalleProps) {
  const qc = useQueryClient();
  const [yapeOpen, setYapeOpen] = useState(false);
  const { data: me } = useGetMe();
  const isAdmin = (me as any)?.role === "administrator";
  const { data, isLoading } = useGetCourse(slug, {
    query: { queryKey: getGetCourseQueryKey(slug) },
  });

  const course = data as CourseDetail | undefined;

  function handlePurchaseSuccess() {
    qc.invalidateQueries({ queryKey: getGetCourseQueryKey(slug) });
  }

  const purchase = course?.purchase;
  const purchaseStatus = purchase?.status;

  return (
    <Layout>
      {course && (
        <Helmet>
          <title>{course.title} · Cursos · AI Community</title>
          <meta name="description" content={course.description || `Curso: ${course.title}`} />
        </Helmet>
      )}

      <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
        <Link href="/cursos">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors" aria-label="Volver a cursos">
            <ArrowLeft className="h-4 w-4" />
            Cursos
          </button>
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : !course ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Curso no encontrado.</p>
            <Link href="/cursos">
              <Button variant="link" className="mt-2">Volver a cursos</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-5">
              {course.coverUrl && (
                <img
                  src={course.coverUrl}
                  alt={course.title}
                  className="w-full h-52 object-cover rounded-xl"
                />
              )}

              <div>
                <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">Por {course.creatorName}</p>
              </div>

              {course.description && (
                <div className="prose prose-sm prose-invert max-w-none text-muted-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {course.description}
                  </ReactMarkdown>
                </div>
              )}

              {/* Modules */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-foreground">
                    Contenido del curso ({course.moduleCount} módulo{course.moduleCount !== 1 ? "s" : ""})
                  </h2>
                </div>
                {course.modules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Este curso no tiene módulos aún.</p>
                ) : (
                  <div className="space-y-2">
                    {course.modules.map((mod, i) => (
                      <ModuleRow
                        key={mod.id}
                        module={mod}
                        hasAccess={course.hasAccess}
                        index={i}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar — purchase/access card */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="text-center">
                  {course.hasAccess ? (
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <CheckCircle className="h-6 w-6" />
                      <span className="font-semibold text-lg">Acceso completo</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-foreground">
                        S/ {Number(course.pricePen).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">pago único · acceso de por vida</p>
                    </>
                  )}
                </div>

                {/* Capacity info */}
                {(course as any).capacity != null ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>{(course as any).capacity} cupos disponibles</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>Cupos ilimitados</span>
                  </div>
                )}

                {/* Admin view: never show purchase buttons */}
                {isAdmin ? (
                  <div className="space-y-2">
                    <div className="rounded-md bg-primary/10 border border-primary/20 p-3 text-sm text-primary/80 flex gap-2">
                      <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Eres administrador. Gestiona este curso desde el panel de admin.</span>
                    </div>
                    <Link href="/admin?tab=cursos">
                      <Button variant="outline" className="w-full gap-2">
                        <Shield className="h-4 w-4" />Ver solicitudes de compra
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Purchase state messages */}
                    {!course.hasAccess && purchaseStatus === "pending" && (
                      <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm text-yellow-200 flex gap-2">
                        <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Pago en revisión</p>
                          <p className="text-yellow-200/70 mt-0.5">Te notificaremos cuando sea aprobado.</p>
                        </div>
                      </div>
                    )}

                    {!course.hasAccess && purchaseStatus === "rejected" && (
                      <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300 flex gap-2">
                        <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Solicitud rechazada</p>
                          {purchase?.adminNotes && (
                            <p className="text-red-300/70 mt-0.5">{purchase.adminNotes}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {course.hasAccess ? (
                      <div className="text-center text-sm text-muted-foreground">
                        <PlayCircle className="h-5 w-5 mx-auto mb-1 text-green-400" />
                        Expande los módulos para ver el contenido
                      </div>
                    ) : purchaseStatus === "pending" ? (
                      <Button className="w-full" variant="outline" disabled>
                        <Clock className="h-4 w-4 mr-2" />
                        Esperando validación
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => setYapeOpen(true)}>
                        {purchaseStatus === "rejected" ? "Reintentar pago" : "Comprar con Yape"}
                      </Button>
                    )}

                    <p className="text-xs text-center text-muted-foreground/60">
                      Pago manual vía Yape · Acceso activado en &lt;24h
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {course && (
        <YapeModal
          open={yapeOpen}
          onOpenChange={setYapeOpen}
          course={course}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </Layout>
  );
}
