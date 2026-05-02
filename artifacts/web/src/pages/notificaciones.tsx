import { Layout } from "@/components/layout";
import { useListNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const QUERY_PARAMS = { unreadOnly: false, limit: 50 };

export default function NotificacionesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useListNotifications(QUERY_PARAMS);
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  const handleMarkAll = () => {
    markAll.mutate(undefined, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey(QUERY_PARAMS) }),
    });
  };

  const handleMarkOne = (id: string) => {
    markOne.mutate({ notificationId: id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey(QUERY_PARAMS) }),
    });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
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
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Marcar todas leídas
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Sin notificaciones por ahora.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n: any) => (
              <Card
                key={n.id}
                className={`transition-colors ${!n.isRead ? "border-primary/30 bg-primary/3" : ""}`}
                data-testid={`notification-${n.id}`}
              >
                <CardContent className="p-4 flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {!n.isRead && (
                        <Badge variant="default" className="text-[10px] h-4 px-1 shrink-0">Nueva</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.link && (
                      <Link href={n.link}>
                        <Button variant="ghost" size="sm" className="text-xs h-7">Ver</Button>
                      </Link>
                    )}
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleMarkOne(n.id)}
                        data-testid={`button-read-${n.id}`}
                      >
                        Leída
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
