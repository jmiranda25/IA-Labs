import { useEffect } from "react";
import { Layout } from "@/components/layout";
import {
  useListMessageThreads,
  getListMessageThreadsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

export default function MessagesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useListMessageThreads({
    query: { queryKey: getListMessageThreadsQueryKey() },
  });
  const threads = (data as any[]) ?? [];

  // Re-fetch threads when SSE fires a message_received event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === "message_received") {
        qc.invalidateQueries({ queryKey: getListMessageThreadsQueryKey() });
      }
    };
    window.addEventListener("sse-notification", handler);
    return () => window.removeEventListener("sse-notification", handler);
  }, [qc]);

  const totalUnread = threads.reduce((sum: number, t: any) => sum + (t.unreadCount ?? 0), 0);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Mensajes
            {totalUnread > 0 && (
              <Badge className="ml-1 h-5 min-w-5 px-1.5 text-xs">{totalUnread}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tus conversaciones del marketplace.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">Sin mensajes</p>
            <p className="text-sm mt-1">
              Contacta a un vendedor desde el marketplace para iniciar una conversación.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((t: any) => (
              <Link
                key={`${t.listingId}:${t.otherUserId}`}
                href={`/mensajes/${t.listingId}/${t.otherUserId}`}
              >
                <Card
                  className={`hover:border-primary/40 transition-colors cursor-pointer ${t.unreadCount > 0 ? "border-primary/20 bg-primary/3" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={t.otherUserAvatar} />
                        <AvatarFallback>{t.otherUserName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="font-semibold text-sm truncate">{t.otherUserName}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            {t.unreadCount > 0 && (
                              <Badge className="h-5 min-w-5 px-1.5 text-xs">{t.unreadCount}</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true, locale: es })}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          Re: <span className="font-medium">{t.listingTitle}</span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{t.lastMessage}</p>
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
