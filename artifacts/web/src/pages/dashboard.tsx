import { Layout } from "@/components/layout";
import { useGetCommunityStats, useGetActivityFeed, useGetUpcomingEvents, useGetTrendingForumPosts, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Users, Calendar, MessageSquare, BookOpen, Clock, TrendingUp, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold tabular-nums" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>{value.toLocaleString()}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: me } = useGetMe();
  const { data: stats, isLoading: statsLoading } = useGetCommunityStats();
  const { data: feed, isLoading: feedLoading } = useGetActivityFeed({ limit: "10" });
  const { data: upcomingEvents } = useGetUpcomingEvents({ limit: "3" });
  const { data: trending } = useGetTrendingForumPosts({ limit: "5" });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{me?.displayName ? `, ${me.displayName}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Here's what's happening in the community.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : stats ? (
            <>
              <StatCard icon={Users} label="Members" value={stats.memberCount} />
              <StatCard icon={Calendar} label="Events" value={stats.eventCount} />
              <StatCard icon={MessageSquare} label="Forum Posts" value={stats.forumPostCount} />
              <StatCard icon={BookOpen} label="Resources" value={stats.resourceCount} />
            </>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {feedLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
                ) : (feed as any[])?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No activity yet — be the first!</p>
                ) : (
                  (feed as any[])?.map((item: any) => (
                    <Link href={item.link ?? "#"} key={item.id}>
                      <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`activity-item-${item.id}`}>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={item.actorAvatar} />
                          <AvatarFallback className="text-xs">{item.actorName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
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
                  <Calendar className="h-4 w-4 text-primary" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(upcomingEvents as any[])?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
                ) : (
                  (upcomingEvents as any[])?.map((event: any) => (
                    <Link href={`/events/${event.id}`} key={event.id}>
                      <div className="p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`event-upcoming-${event.id}`}>
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.startAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                          {event.isVirtual && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-1">Virtual</Badge>}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
                <Link href="/events" className="block text-xs text-primary hover:underline text-center pt-1">View all events</Link>
              </CardContent>
            </Card>

            {/* Trending Posts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Trending in Forum
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(trending as any[])?.map((post: any) => (
                  <Link href={`/forum/${post.id}`} key={post.id}>
                    <div className="p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`trending-post-${post.id}`}>
                      <p className="text-sm line-clamp-2">{post.title}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{post.replyCount} replies</span>
                        <span className="text-xs text-muted-foreground">{post.reactionCount} reactions</span>
                      </div>
                    </div>
                  </Link>
                ))}
                <Link href="/forum" className="block text-xs text-primary hover:underline text-center pt-1">Visit forum</Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
