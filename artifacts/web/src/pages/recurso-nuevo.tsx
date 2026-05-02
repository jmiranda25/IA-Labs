import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import {
  useCreateResource,
  useUploadResourceFile,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  ArrowLeft,
  CheckCircle,
  Link2,
  FileDown,
  GraduationCap,
  Upload,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Link } from "wouter";

const schema = z
  .object({
    title: z.string().min(3, "El título es requerido (mín. 3 caracteres)"),
    type: z.enum(["link", "file", "course"], {
      required_error: "Selecciona el tipo",
    }),
    url: z.string().url("URL inválida").optional().or(z.literal("")),
    description: z.string().optional(),
    coverUrl: z
      .string()
      .url("URL de portada inválida")
      .optional()
      .or(z.literal("")),
    tags: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "link" || data.type === "course") {
      if (!data.url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La URL es requerida para este tipo",
          path: ["url"],
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

export default function RecursoNuevoPage() {
  const [, setLocation] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");

  const createResource = useCreateResource();
  const uploadFileMutation = useUploadResourceFile();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "link", tags: "" },
  });

  const selectedType = watch("type");

  const onSubmit = async (values: FormValues) => {
    try {
      const tags = values.tags
        ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const created = await createResource.mutateAsync({
        data: {
          title: values.title,
          type: values.type,
          url: values.url || undefined,
          description: values.description || undefined,
          coverUrl: values.coverUrl || undefined,
          tags,
        },
      });

      const resource = created as any;
      setCreatedSlug(resource.slug);

      if (values.type === "file" && uploadFile) {
        setUploading(true);
        try {
          await uploadFileMutation.mutateAsync({
            slug: resource.slug,
            data: { file: uploadFile },
          });
        } finally {
          setUploading(false);
        }
      }

      setSubmitted(true);
    } catch {
      toast.error("Error al enviar el recurso. Inténtalo de nuevo.");
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto p-6 text-center py-20">
          <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">¡Recurso enviado!</h2>
          <p className="text-muted-foreground mb-6">
            Tu recurso ha quedado en revisión y será publicado una vez que un
            administrador lo apruebe.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/recursos">
              <Button variant="outline">Ver recursos</Button>
            </Link>
            <Button
              onClick={() => {
                setSubmitted(false);
                setCreatedSlug("");
                setUploadFile(null);
              }}
            >
              Enviar otro
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <Link href="/recursos">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 mb-5 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Recursos
          </Button>
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Compartir un recurso
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Comparte un enlace, archivo o curso con la comunidad.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Nombre del recurso"
                  {...register("title")}
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="link">
                          <span className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-accent" />
                            Enlace
                          </span>
                        </SelectItem>
                        <SelectItem value="file">
                          <span className="flex items-center gap-2">
                            <FileDown className="h-4 w-4 text-primary" />
                            Archivo
                          </span>
                        </SelectItem>
                        <SelectItem value="course">
                          <span className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-orange-400" />
                            Curso
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* URL — required for link/course */}
              {(selectedType === "link" || selectedType === "course") && (
                <div className="space-y-1.5">
                  <Label htmlFor="url">URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://..."
                    {...register("url")}
                    className={errors.url ? "border-destructive" : ""}
                  />
                  {errors.url && (
                    <p className="text-xs text-destructive">
                      {errors.url.message}
                    </p>
                  )}
                </div>
              )}

              {/* File upload — only for type=file */}
              {selectedType === "file" && (
                <div className="space-y-1.5">
                  <Label>Archivo</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                      uploadFile
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={(e) =>
                        setUploadFile(e.target.files?.[0] ?? null)
                      }
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      {uploadFile ? (
                        <span className="text-sm text-foreground font-medium">
                          {uploadFile.name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Haz clic para seleccionar un archivo (máx. 50 MB)
                        </span>
                      )}
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Puedes subir el archivo después de crear el recurso.
                  </p>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">
                  Descripción{" "}
                  <span className="text-muted-foreground font-normal">
                    (soporta Markdown)
                  </span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe el recurso, qué contiene, para quién es..."
                  rows={4}
                  {...register("description")}
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label htmlFor="tags">
                  Etiquetas{" "}
                  <span className="text-muted-foreground font-normal">
                    (separadas por coma)
                  </span>
                </Label>
                <Input
                  id="tags"
                  placeholder="python, machine-learning, tutorial"
                  {...register("tags")}
                />
              </div>

              {/* Cover URL */}
              <div className="space-y-1.5">
                <Label htmlFor="coverUrl">
                  URL de portada{" "}
                  <span className="text-muted-foreground font-normal">
                    (opcional)
                  </span>
                </Label>
                <Input
                  id="coverUrl"
                  type="url"
                  placeholder="https://..."
                  {...register("coverUrl")}
                  className={errors.coverUrl ? "border-destructive" : ""}
                />
                {errors.coverUrl && (
                  <p className="text-xs text-destructive">
                    {errors.coverUrl.message}
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="h-5 w-5 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs">⏳</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tu recurso quedará en revisión hasta que un administrador lo
                  apruebe y publique.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isSubmitting ||
                  uploading ||
                  createResource.isPending
                }
              >
                {isSubmitting || uploading || createResource.isPending
                  ? "Enviando..."
                  : "Enviar recurso"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
