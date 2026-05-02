import { Layout } from "@/components/layout";
import {
  useGetMyNotificationPreferences,
  useUpdateMyNotificationPreferences,
  getGetMyNotificationPreferencesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Bell, MessageSquare, Calendar, MessageCircle, Shield, BookOpen, ShoppingBag,
} from "lucide-react";
import { useState, useEffect } from "react";

type PrefsKey = "forum_reply" | "event_rsvp" | "marketplace_message" | "admin_action" | "resource_status" | "listing_status";

const PREF_CONFIG: { key: PrefsKey; label: string; description: string; icon: React.ElementType }[] = [
  {
    key: "forum_reply",
    label: "Respuestas en el foro",
    description: "Cuando alguien responde a un hilo que creaste.",
    icon: MessageSquare,
  },
  {
    key: "event_rsvp",
    label: "Inscripciones a eventos",
    description: "Cuando alguien se apunta a un evento que organizas.",
    icon: Calendar,
  },
  {
    key: "marketplace_message",
    label: "Mensajes en el marketplace",
    description: "Cuando recibes un mensaje sobre un anuncio.",
    icon: MessageCircle,
  },
  {
    key: "admin_action",
    label: "Acciones de administración",
    description: "Cuando un admin realiza una acción en tu contenido.",
    icon: Shield,
  },
  {
    key: "resource_status",
    label: "Estado de recursos",
    description: "Cuando un recurso tuyo es aprobado o rechazado.",
    icon: BookOpen,
  },
  {
    key: "listing_status",
    label: "Estado de anuncios",
    description: "Cuando un anuncio tuyo es aprobado o rechazado.",
    icon: ShoppingBag,
  },
];

const DEFAULT_PREFS: Record<PrefsKey, boolean> = {
  forum_reply: true,
  event_rsvp: true,
  marketplace_message: true,
  admin_action: true,
  resource_status: true,
  listing_status: true,
};

export default function PreferenciasNotificacionesPage() {
  const qc = useQueryClient();
  const { data: serverPrefs, isLoading } = useGetMyNotificationPreferences();
  const update = useUpdateMyNotificationPreferences();

  const [local, setLocal] = useState<Record<PrefsKey, boolean>>(DEFAULT_PREFS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (serverPrefs) {
      setLocal(serverPrefs as Record<PrefsKey, boolean>);
      setDirty(false);
    }
  }, [serverPrefs]);

  const toggle = (key: PrefsKey) => {
    setLocal((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const handleSave = () => {
    const optimistic = { ...local };
    qc.setQueryData(getGetMyNotificationPreferencesQueryKey(), optimistic);
    update.mutate(
      { data: local },
      {
        onSuccess: (data) => {
          qc.setQueryData(getGetMyNotificationPreferencesQueryKey(), data);
          setDirty(false);
          toast.success("Preferencias guardadas");
        },
        onError: () => {
          qc.setQueryData(getGetMyNotificationPreferencesQueryKey(), serverPrefs);
          setLocal((serverPrefs as Record<PrefsKey, boolean>) ?? DEFAULT_PREFS);
          toast.error("Error al guardar preferencias");
        },
      },
    );
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Preferencias de notificaciones</h1>
            <p className="text-sm text-muted-foreground">Elige qué notificaciones quieres recibir.</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tipos de notificación</CardTitle>
            <CardDescription>
              Si desactivas un tipo, no recibirás notificaciones ni en el centro ni como toast.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-6 w-10 rounded-full" />
                </div>
              ))
            ) : (
              PREF_CONFIG.map(({ key, label, description, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-lg px-1 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <Label htmlFor={`pref-${key}`} className="text-sm font-medium cursor-pointer">
                        {label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </div>
                  <Switch
                    id={`pref-${key}`}
                    checked={local[key] ?? true}
                    onCheckedChange={() => toggle(key)}
                    data-testid={`switch-${key}`}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end mt-4">
          <Button
            onClick={handleSave}
            disabled={!dirty || update.isPending}
            data-testid="button-save-prefs"
          >
            {update.isPending ? "Guardando..." : "Guardar preferencias"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
