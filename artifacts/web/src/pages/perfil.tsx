import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetMe,
  useUpdateMe,
  useCheckUsernameAvailability,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { CheckCircle, XCircle, Upload, UserCircle, Loader2, CreditCard, Eye, EyeOff } from "lucide-react";

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

const schema = z.object({
  displayName: z
    .string()
    .min(1, "El nombre no puede estar vacío")
    .max(80, "Máximo 80 caracteres"),
  username: z
    .string()
    .refine(
      (v) => v === "" || USERNAME_RE.test(v),
      "Solo letras minúsculas, números y guiones bajos (3–24 caracteres)"
    )
    .optional()
    .default(""),
  bio: z.string().max(280, "Máximo 280 caracteres").optional().default(""),
  location: z.string().max(100).optional().default(""),
  website: z
    .string()
    .refine((v) => v === "" || /^https?:\/\/.+/.test(v), "URL no válida")
    .optional()
    .default(""),
  skills: z.string().optional().default(""),
});

type FormValues = z.infer<typeof schema>;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function PerfilPage() {
  const { data: me, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const qc = useQueryClient();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formReady, setFormReady] = useState(false);

  const m = me as any;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: "",
      username: "",
      bio: "",
      location: "",
      website: "",
      skills: "",
    },
  });

  if (m && !formReady) {
    form.reset({
      displayName: m.displayName ?? "",
      username: m.username ?? "",
      bio: m.bio ?? "",
      location: m.location ?? "",
      website: m.website ?? "",
      skills: (m.skills as string[])?.join(", ") ?? "",
    });
    setFormReady(true);
  }

  const usernameValue = form.watch("username") ?? "";
  const bioValue = form.watch("bio") ?? "";
  const bioLen = bioValue.length;

  const debouncedUsername = useDebounce(usernameValue, 450);
  const originalUsername = m?.username ?? "";
  const usernameIsNew =
    debouncedUsername !== originalUsername &&
    debouncedUsername.length >= 3 &&
    USERNAME_RE.test(debouncedUsername);

  const { data: usernameCheck, isFetching: checkingUsername } =
    useCheckUsernameAvailability(
      { value: debouncedUsername || "__placeholder__" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { query: { enabled: usernameIsNew } as any }
    );

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor sube una imagen válida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 5 MB");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onSubmit = async (data: FormValues) => {
    const prevSnapshot = qc.getQueryData(getGetMeQueryKey());
    const skills = data.skills
      ? data.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    try {
      let finalAvatarUrl = m?.avatarUrl ?? null;

      if (avatarFile) {
        setIsUploading(true);
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        const res = await fetch(`${basePath}/api/users/me/avatar`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        setIsUploading(false);
        if (!res.ok) {
          toast.error("Error al subir el avatar");
          return;
        }
        const json = (await res.json()) as { avatarUrl: string };
        finalAvatarUrl = json.avatarUrl;
      }

      qc.setQueryData(getGetMeQueryKey(), (old: any) => ({
        ...old,
        displayName: data.displayName,
        username: data.username || old?.username || null,
        bio: data.bio || null,
        location: data.location || null,
        website: data.website || null,
        skills,
        avatarUrl: finalAvatarUrl,
      }));

      await updateMe.mutateAsync({
        data: {
          displayName: data.displayName,
          username: data.username || undefined,
          bio: data.bio || null,
          location: data.location || null,
          website: data.website || null,
          skills,
          avatarUrl: finalAvatarUrl,
        },
      });

      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("¡Perfil actualizado!");
    } catch (err: any) {
      setIsUploading(false);
      qc.setQueryData(getGetMeQueryKey(), prevSnapshot);
      const isConflict =
        String(err?.message ?? "").includes("409") ||
        String(err?.status ?? "").includes("409");
      toast.error(
        isConflict
          ? "El nombre de usuario ya está en uso"
          : "Error al guardar el perfil"
      );
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6">
          <Skeleton className="h-12 w-48 mb-4 rounded-lg" />
          <Skeleton className="h-64 rounded-xl mb-4" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </Layout>
    );
  }

  const currentAvatar = avatarPreview ?? m?.avatarUrl;
  const isBusy = updateMe.isPending || isUploading;
  const usernameUnavailable =
    usernameIsNew && !checkingUsername && usernameCheck?.available === false;
  const canSubmit = !isBusy && !usernameUnavailable && !(usernameIsNew && checkingUsername);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-primary" />
            Mi Perfil
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Personaliza cómo te ven otros miembros de la comunidad.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Foto de perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20 shrink-0 rounded-xl">
                  <AvatarImage src={currentAvatar} className="object-cover" />
                  <AvatarFallback className="text-2xl bg-primary/20 text-primary rounded-xl">
                    {m?.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all select-none ${
                    isDragging
                      ? "border-primary bg-primary/10 scale-[0.99]"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && fileInputRef.current?.click()
                  }
                  aria-label="Subir foto de perfil"
                  data-testid="avatar-dropzone"
                >
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    {avatarFile
                      ? avatarFile.name
                      : "Arrastra aquí o haz clic para subir"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, WebP · Máx. 5 MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                  data-testid="avatar-file-input"
                />
              </div>
            </CardContent>
          </Card>

          {/* Public info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información pública</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display name */}
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Nombre completo</Label>
                <Input
                  id="displayName"
                  placeholder="Tu nombre visible"
                  {...form.register("displayName")}
                  data-testid="input-display-name"
                />
                {form.formState.errors.displayName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.displayName.message}
                  </p>
                )}
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username">Nombre de usuario</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none pointer-events-none">
                    @
                  </span>
                  <Input
                    id="username"
                    placeholder="tunombre"
                    className="pl-7 pr-9"
                    {...form.register("username")}
                    data-testid="input-username"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {usernameIsNew && checkingUsername && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {usernameIsNew &&
                      !checkingUsername &&
                      usernameCheck?.available === true && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    {usernameIsNew &&
                      !checkingUsername &&
                      usernameCheck?.available === false && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                  </div>
                </div>
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.username.message}
                  </p>
                )}
                {usernameUnavailable && (
                  <p className="text-xs text-destructive">
                    Este nombre de usuario ya está en uso
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Solo letras minúsculas, números y guiones bajos (3–24
                  caracteres)
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bio">Biografía</Label>
                  <span
                    className={`text-xs tabular-nums ${
                      bioLen > 270
                        ? bioLen > 280
                          ? "text-destructive font-medium"
                          : "text-amber-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {bioLen}/280
                  </span>
                </div>
                <Textarea
                  id="bio"
                  rows={3}
                  placeholder="Cuéntale a la comunidad sobre ti..."
                  {...form.register("bio")}
                  data-testid="input-bio"
                />
                {form.formState.errors.bio && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.bio.message}
                  </p>
                )}
              </div>

              {/* Location & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    placeholder="Ciudad, País"
                    {...form.register("location")}
                    data-testid="input-location"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website">Sitio web</Label>
                  <Input
                    id="website"
                    placeholder="https://..."
                    {...form.register("website")}
                    data-testid="input-website"
                  />
                  {form.formState.errors.website && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.website.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-1.5">
                <Label htmlFor="skills">
                  Habilidades{" "}
                  <span className="text-muted-foreground font-normal">
                    (separadas por comas)
                  </span>
                </Label>
                <Input
                  id="skills"
                  placeholder="Python, LLMs, Visión por computadora..."
                  {...form.register("skills")}
                  data-testid="input-skills"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full"
            data-testid="button-save-profile"
          >
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </form>

        {/* Card visibility */}
        <CardVisibilityToggle username={m?.username} isPublic={m?.isPublic ?? true} />
      </div>
    </Layout>
  );
}

function CardVisibilityToggle({ username, isPublic: initialIsPublic }: { username?: string | null; isPublic: boolean }) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [saving, setSaving] = useState(false);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const qc = useQueryClient();

  const toggle = async () => {
    const next = !isPublic;
    setSaving(true);
    try {
      const res = await fetch(`${basePath}/api/users/me/card-visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublic: next }),
      });
      if (res.ok) {
        setIsPublic(next);
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast.success(next ? "Tarjeta pública activada" : "Tarjeta hecha privada");
      } else {
        toast.error("Error al actualizar la visibilidad");
      }
    } catch {
      toast.error("Error al actualizar la visibilidad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          Tarjeta de miembro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Perfil público</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPublic
                ? "Tu tarjeta es visible para cualquiera con el enlace."
                : "Tu tarjeta está oculta — solo tú puedes verla."}
            </p>
          </div>
          <Button
            variant={isPublic ? "default" : "outline"}
            size="sm"
            className="gap-2 shrink-0"
            onClick={toggle}
            disabled={saving}
            data-testid="button-toggle-card-visibility"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPublic ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            {isPublic ? "Pública" : "Privada"}
          </Button>
        </div>

        {username && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Tu enlace de tarjeta:</p>
              <p className="text-xs font-mono text-foreground truncate mt-0.5">
                {window.location.origin}{basePath}/m/{username}
              </p>
            </div>
            <a href={`${basePath}/m/${username}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 text-xs">
                <Eye className="h-3.5 w-3.5" />
                Ver
              </Button>
            </a>
          </div>
        )}

        {!username && (
          <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
            <EyeOff className="h-3.5 w-3.5 shrink-0" />
            Configura un nombre de usuario arriba para activar tu tarjeta.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
