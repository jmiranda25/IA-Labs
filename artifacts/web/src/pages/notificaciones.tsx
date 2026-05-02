import { Layout } from "@/components/layout";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useGetMyNotificationPreferences,
  getListNotificationsQueryKey,
  getGetNotificationsUnreadCountQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import {
  Bell, CheckCheck, MessageSquare, Calendar, MessageCircle,
  Shield, BookOpen, ShoppingBag, AlertCircle,
} from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { es } from "date-fns/locale";

const QUERY_PARAMS = { unreadOnly: false, limit: 50 };

const TYPE_ICON: Record<string, React.ElementType> = {
  forum_reply: MessageSquare,
  event_rsvp: Calendar,
  marketplace_message: MessageCircle,
  admin_action: Shield,
  resource_status: BookOpen,
  listing_status: ShoppingBag,
};

const TYPE_LABEL: Record<string, string> = {
  forum_reply: "Foro",
  event_rsvp: "Eventos",
  marketplace_message: "Mensajes",
  admin_action: "Admin",
  resource_status: "Recursos",
  listing_status: "Marketplace",
};

function dateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Hoy";
  if (isYesterday(d)) return "Ayer";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "Esta semana";
  return "Más antiguas";
}

const GROUP_ORDER = ["Hoy", "Ayer", "Esta semana", "Más antiguas"];

export default function NotificacionesPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data, isLoading } = useListNotifications(QUERY_PARAMS);
  const { data: prefs } = useGetMyNotificationPreferences();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListNotificationsQueryKey(QUERY_PARAMS) });
    qc.invalidateQueries({ queryKey: getGetNotificationsUnreadCountQueryKey() });
  };

  const handleMarkAll = () => markAll.mutate(undefined, { onSuccess: invalidate });
  const handleMarkOne = (id: string) =>
    markOne.mutate({ notificationId: id }, { onSuccess: invalidate });

  // Group by date label
  const groups: Record<string, typeof notifications> = {};
  for (const n of notifications) {
    const label = dateGroup(n.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }

  const hasDisabled = prefs && Object.values(prefs).some((v) => v === false);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" aria-hidden="true" />
              Notificaciones
            </h1>
            {unread > 0 && (
              <p className="text-sm text-muted-foreground mt-1">{unread} sin leer</p>
            )}
          </div>
          {unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleMarkAll}
              disabled={markAll.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-4 w-4" />
              Marcar todas leídas
            </Button>
          )}
        </div>

        {/* Disabled-types banner */}
        {hasDisabled && (
          <div className="flex items-center gap-3 mb-5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm text-yellow-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Tienes algunas notificaciones desactivadas.</span>
            <button
              className="ml-auto underline hover:no-underline shrink-0"
              onClick={() => setLocation("/perfil/preferencias")}
            >
              Editar →
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Sin notificaciones por ahora.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {GROUP_ORDER.filter((g) => groups[g]?.length).map((group) => (
              <section key={group}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  {group}
                </h2>
                <div className="space-y-2">
                  {groups[group].map((n: any) => {
                    const Icon = TYPE_ICON[n.type] ?? Bell;
                    return (
                      <Card
                        key={n.id}
                        className={`transition-colors ${!n.isRead ? "border-primary/30 bg-primary/5" : ""}`}
                        data-testid={`notification-${n.id}`}
                      >
                        <CardContent className="p-4 flex gap-3">
                          {/* Type icon */}
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${!n.isRead ? "bg-primary/20" : "bg-muted"}`}>
                            <Icon className={`h-4 w-4 ${!n.isRead ? "text-primary" : "text-muted-foreground"}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-medium truncate">{n.title}</p>
                              {!n.isRead && (
                                <Badge variant="default" className="text-[10px] h-4 px-1 shrink-0">Nueva</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[11px] text-muted-foreground/60">
                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })}
                              </span>
                              <span className="text-[11px] text-muted-foreground/40">·</span>
                              <span className="text-[11px] text-muted-foreground/50">{TYPE_LABEL[n.type] ?? n.type}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-start gap-1 shrink-0 pt-0.5">
                            {n.link && (
                              <Link href={n.link}>
                                <Button variant="ghost" size="sm" className="text-xs h-7 px-2">Ver</Button>
                              </Link>
                            )}
                            {!n.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 px-2 text-muted-foreground"
                                onClick={() => handleMarkOne(n.id)}
                                data-testid={`button-read-${n.id}`}
                              >
                                Leída
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
