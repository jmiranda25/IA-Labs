import { Layout } from "@/components/layout";
import {
  useGetCommunityStats,
  useGetActivityFeed,
  useGetUpcomingEvents,
  useListForumCategories,
  useGetMe,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Users, Calendar, MessageSquare, BookOpen, Clock, TrendingUp,
  Zap, Plus, ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold tabular-nums" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
              {value.toLocaleString("es")}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const quickActions = [
  {
    href: "/foro",
    icon: MessageSquare,
    label: "Iniciar tema en foro",
    sub: "Comparte con la comunidad",
    adminOnly: false,
  },
  {
    href: "/members",
    icon: Users,
    label: "Buscar miembros",
    sub: "Conecta con la comunidad",
    adminOnly: false,
  },
  {
    href: "/resources",
    icon: BookOpen,
    label: "Subir recurso",
    sub: "Comparte conocimiento",
    adminOnly: false,
  },
];

export default function DashboardPage() {
  const { data: me } = useGetMe();
  const { data: stats, isLoading: statsLoading } = useGetCommunityStats();
  const { data: feed, isLoading: feedLoading } = useGetActivityFeed({ limit: 10 });
  const { data: upcomingEvents } = useGetUpcomingEvents({ limit: 3 });
  const { data: forumCategories } = useListForumCategories();
  const isAdmin = (me as any)?.role === "administrator";

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Bienvenido de vuelta{me?.displayName ? `, ${me.displayName}` : ""}
            {isAdmin && (
              <Badge variant="secondary" className="ml-2 text-xs align-middle">Admin</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Esto es lo que está pasando en la comunidad.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {isAdmin && (
            <Link href="/events">
              <Card className="hover:border-primary/40 cursor-pointer transition-colors group h-full" data-testid="quick-action-crear-evento">
                <CardContent className="p-5 flex flex-col items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Crear evento</p>
                    <p className="text-xs text-muted-foreground">Solo administradores</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {quickActions.map(({ href, icon: Icon, label, sub }) => (
            <Link key={href} href={href}>
              <Card className="hover:border-primary/40 cursor-pointer transition-colors group h-full" data-testid={`quick-action-${label.toLowerCase().replace(/\s/g, "-")}`}>
                <CardContent className="p-5 flex flex-col items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : stats ? (
            <>
              <StatCard icon={Users}         label="Miembros"      value={stats.memberCount} />
              <StatCard icon={Calendar}      label="Eventos"       value={stats.eventCount} />
              <StatCard icon={MessageSquare} label="Publicaciones" value={stats.forumPostCount} />
              <StatCard icon={BookOpen}      label="Recursos"      value={stats.resourceCount} />
            </>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                  Actividad reciente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {feedLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
                ) : (feed as any[])?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aún no hay actividad — ¡sé el primero!
                  </p>
                ) : (
                  (feed as any[])?.map((item: any) => (
                    <Link href={item.link ?? "#"} key={item.id}>
                      <div
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        data-testid={`activity-item-${item.id}`}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={item.actorAvatar} />
                          <AvatarFallback className="text-xs">{item.actorName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Upcoming Events */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                  Próximos eventos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(upcomingEvents as any[])?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay eventos próximos</p>
                ) : (
                  (upcomingEvents as any[])?.map((event: any) => (
                    <Link href={`/eventos/${event.slug}`} key={event.id}>
                      <div
                        className="p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        data-testid={`event-upcoming-${event.id}`}
                      >
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.startsAt).toLocaleDateString("es", { month: "short", day: "numeric" })}
                          </span>
                          {event.isOnline && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1">Online</Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
                <Link href="/eventos" className="flex items-center gap-1 text-xs text-primary hover:underline pt-1">
                  Ver todos los eventos <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>

            {/* Forum Categories */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                  Categorías del foro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(forumCategories as any[])?.slice(0, 4).map((cat: any) => (
                  <Link href={`/foro/${cat.slug}`} key={cat.id}>
                    <div
                      className="p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      data-testid={`forum-cat-${cat.id}`}
                    >
                      <p className="text-sm font-medium truncate">{cat.name}</p>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">{cat.threadCount} temas</span>
                        <span className="text-xs text-muted-foreground">{cat.postCount} posts</span>
                      </div>
                    </div>
                  </Link>
                ))}
                <Link href="/foro" className="flex items-center gap-1 text-xs text-primary hover:underline pt-1">
                  Ir al foro <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
