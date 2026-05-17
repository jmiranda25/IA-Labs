import { Layout } from "@/components/layout";
import {
  useGetCommunityStats,
  useGetActivityFeed,
  useGetUpcomingEvents,
  useListForumCategories,
  useGetMe,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Users, Calendar, MessageSquare, BookOpen, Clock,
  Plus, ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

function StatBlock({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="space-y-1 py-4 px-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-3xl font-light tabular-nums text-foreground" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
        {value.toLocaleString("es")}
      </p>
      {sub && <p className="text-xs text-muted-foreground/60">{sub}</p>}
    </div>
  );
}

const quickActions = [
  { href: "/foro",      icon: MessageSquare, label: "Nuevo tema" },
  { href: "/miembros",  icon: Users,         label: "Miembros" },
  { href: "/recursos",  icon: BookOpen,       label: "Subir recurso" },
  { href: "/eventos",   icon: Calendar,       label: "Ver eventos" },
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
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            Bienvenido{me?.displayName ? `, ${me.displayName}` : ""}
            {isAdmin && (
              <Badge variant="secondary" className="ml-3 text-xs align-middle">Admin</Badge>
            )}
          </h1>
          <p className="text-white/50 text-sm mt-2 uppercase tracking-widest text-[11px]">
            Lo que está pasando en la comunidad
          </p>
        </div>

        {/* Quick Actions — horizontal strip */}
        <div className="flex items-center gap-8 border-y border-border/50 py-5 mb-10 overflow-x-auto">
          {isAdmin && (
            <Link href="/eventos">
              <div className="flex items-center gap-2.5 cursor-pointer group shrink-0" data-testid="quick-action-crear-evento">
                <Plus className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
                  Crear evento
                </span>
              </div>
            </Link>
          )}
          {quickActions.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <div className="flex items-center gap-2.5 cursor-pointer group shrink-0" data-testid={`quick-action-${label.toLowerCase().replace(/\s/g, "-")}`}>
                <Icon className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
                  {label}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Community Stats — borderless blocks */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border/50 border border-border/50 mb-10">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : stats ? (
            <>
              <StatBlock label="Miembros"      value={stats.memberCount} />
              <StatBlock label="Eventos"       value={stats.eventCount} />
              <StatBlock label="Publicaciones" value={stats.forumPostCount} />
              <StatBlock label="Recursos"      value={stats.resourceCount} />
            </>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Activity Feed — timeline style */}
          <div className="lg:col-span-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6">Actividad reciente</p>
            <div className="space-y-0">
              {feedLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 mb-3" />)
              ) : (feed as any[])?.length === 0 ? (
                <p className="text-sm text-white/40 py-6">
                  Aún no hay actividad — ¡sé el primero!
                </p>
              ) : (
                (feed as any[])?.map((item: any) => (
                  <Link href={item.link ?? "#"} key={item.id}>
                    <div
                      className="flex items-start gap-4 py-3.5 border-l-2 border-primary/25 pl-4 hover:border-primary/60 transition-colors cursor-pointer group"
                      data-testid={`activity-item-${item.id}`}
                    >
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarImage src={item.actorAvatar} />
                        <AvatarFallback className="text-xs">{item.actorName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground group-hover:text-primary transition-colors truncate">{item.title}</p>
                        <p className="text-[11px] text-white/40 mt-0.5">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="space-y-8">
            {/* Upcoming Events */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6">Próximos eventos</p>
              <div className="space-y-0">
                {(upcomingEvents as any[])?.length === 0 ? (
                  <p className="text-sm text-white/40 py-4">No hay eventos próximos</p>
                ) : (
                  (upcomingEvents as any[])?.map((event: any) => (
                    <Link href={`/eventos/${event.slug}`} key={event.id}>
                      <div
                        className="flex items-start gap-3 py-3 border-b border-border/40 hover:border-border/80 transition-colors cursor-pointer group"
                        data-testid={`event-upcoming-${event.id}`}
                      >
                        <div className="shrink-0 text-center w-10">
                          <p className="text-lg font-light text-primary leading-none">
                            {new Date(event.startsAt).toLocaleDateString("es", { day: "numeric" })}
                          </p>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            {new Date(event.startsAt).toLocaleDateString("es", { month: "short" })}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-light text-foreground group-hover:text-primary transition-colors truncate">{event.title}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="h-2.5 w-2.5 text-muted-foreground" aria-hidden="true" />
                            <span className="text-[11px] text-white/40">
                              {new Date(event.startsAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
                <Link href="/eventos" className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary hover:text-primary/70 transition-colors pt-3">
                  Ver todos <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Forum Categories */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-6">Categorías del foro</p>
              <div className="space-y-0">
                {(forumCategories as any[])?.slice(0, 4).map((cat: any) => (
                  <Link href={`/foro/${cat.slug}`} key={cat.id}>
                    <div
                      className="flex items-center justify-between py-3 border-b border-border/40 hover:border-border/80 transition-colors cursor-pointer group"
                      data-testid={`forum-cat-${cat.id}`}
                    >
                      <p className="text-sm font-light text-foreground group-hover:text-primary transition-colors truncate">{cat.name}</p>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0 ml-3">{cat.threadCount} temas</span>
                    </div>
                  </Link>
                ))}
                <Link href="/foro" className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary hover:text-primary/70 transition-colors pt-3">
                  Ir al foro <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
