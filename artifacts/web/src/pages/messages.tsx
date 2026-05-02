import { Layout } from "@/components/layout";
import { useListMyMessages } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function MessagesPage() {
  const { data, isLoading } = useListMyMessages();
  const threads = (data as any[]) ?? [];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" />Messages</h1>
          <p className="text-muted-foreground text-sm mt-1">Your marketplace conversations.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No messages yet. Browse the marketplace to start a conversation.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((t: any) => (
              <Link href={`/marketplace/${t.listingId}`} key={t.listingId}>
                <Card className="hover:border-primary/40 transition-colors cursor-pointer" data-testid={`thread-${t.listingId}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={t.otherUserAvatar} />
                        <AvatarFallback>{t.otherUserName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="font-semibold text-sm">{t.otherUserName}</p>
                          {t.unreadCount > 0 && (
                            <Badge className="h-5 min-w-5 text-xs px-1" data-testid={`unread-${t.listingId}`}>{t.unreadCount}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{t.listingTitle}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.lastMessage}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
