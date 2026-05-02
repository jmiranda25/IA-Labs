import { Layout } from "@/components/layout";
import { useGetUserById, useListForumPosts, getGetUserByIdQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { MapPin, Globe, Calendar, MessageSquare, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function MemberProfilePage({ userId }: { userId: string }) {
  const { data: user, isLoading } = useGetUserById(userId, {
    query: { queryKey: getGetUserByIdQueryKey(userId) },
  });

  const { data: postsData } = useListForumPosts({ limit: "5" });
  const userPosts = ((postsData as any)?.posts ?? []).filter((p: any) => p.authorId === (user as any)?.id);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!user) return <Layout><div className="p-6 text-center text-muted-foreground">Member not found.</div></Layout>;

  const u = user as any;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Profile header */}
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-24 w-24 shrink-0">
                <AvatarImage src={u.avatarUrl} />
                <AvatarFallback className="text-2xl">{u.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                  <h1 className="text-2xl font-bold" data-testid="text-member-name">{u.displayName}</h1>
                  {u.role === "administrator" && (
                    <Badge variant="default" className="gap-1"><Shield className="h-3 w-3" />Admin</Badge>
                  )}
                  {u.isBanned && <Badge variant="destructive">Banned</Badge>}
                </div>
                {u.bio && <p className="text-muted-foreground text-sm mb-4">{u.bio}</p>}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground justify-center sm:justify-start">
                  {u.location && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{u.location}</span>
                  )}
                  {u.website && (
                    <a href={u.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <Globe className="h-3.5 w-3.5" />{u.website}
                    </a>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {formatDistanceToNow(new Date(u.joinedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>

            {(u.skills as string[])?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {(u.skills as string[]).map((s: string) => (
                    <Badge key={s} variant="secondary" data-testid={`badge-skill-${s}`}>{s}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Forum posts */}
        {userPosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Forum Posts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {userPosts.map((post: any) => (
                <Link href={`/forum/${post.id}`} key={post.id}>
                  <div className="p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`post-${post.id}`}>
                    <p className="text-sm font-medium">{post.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
