import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetMarketplaceListing, useSendMessage, useGetMessageThread, useGetMe, getGetMarketplaceListingQueryKey, getGetMessageThreadQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Send, ShoppingBag } from "lucide-react";

export default function MarketplaceListingPage({ listingId }: { listingId: string }) {
  const qc = useQueryClient();
  const { data: listing, isLoading } = useGetMarketplaceListing(listingId, { query: { queryKey: getGetMarketplaceListingQueryKey(listingId) } });
  const { data: me } = useGetMe();
  const { data: thread } = useGetMessageThread(listingId, { query: { queryKey: getGetMessageThreadQueryKey(listingId) } });
  const sendMsg = useSendMessage();
  const [message, setMessage] = useState("");

  const l = listing as any;
  const msgs = (thread as any[]) ?? [];
  const isOwner = me?.id === l?.authorId;

  const handleSend = () => {
    if (!message.trim()) return;
    sendMsg.mutate({ listingId, data: { receiverId: l.authorId, body: message } }, {
      onSuccess: () => {
        setMessage("");
        qc.invalidateQueries({ queryKey: getGetMessageThreadQueryKey(listingId) });
      },
    });
  };

  if (isLoading) return <Layout><div className="max-w-3xl mx-auto p-6"><Skeleton className="h-96 rounded-xl" /></div></Layout>;
  if (!l) return <Layout><div className="p-6 text-center text-muted-foreground">Listing not found.</div></Layout>;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Card>
          {l.imageUrl && (
            <div className="h-56 rounded-t-xl overflow-hidden">
              <img src={l.imageUrl} alt={l.title} className="w-full h-full object-cover" />
            </div>
          )}
          <CardContent className="p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold" data-testid="text-listing-title">{l.title}</h1>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={l.type === "offering" ? "default" : "secondary"}>{l.type === "offering" ? "Offering" : "Seeking"}</Badge>
                {l.status !== "active" && <Badge variant="destructive">{l.status}</Badge>}
              </div>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed mb-6">{l.description}</p>

            {(l.tags as string[])?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {(l.tags as string[]).map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={l.authorAvatar} />
                <AvatarFallback className="text-xs">{l.authorName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{l.authorName}</p>
                <p className="text-xs text-muted-foreground">Posted {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        {!isOwner && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
                <MessageCircle className="h-4 w-4 text-primary" />
                Message Seller
              </h2>

              {msgs.length > 0 && (
                <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
                  {msgs.map((msg: any) => {
                    const isMine = msg.senderId === me?.id;
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`} data-testid={`msg-${msg.id}`}>
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={msg.senderAvatar} />
                          <AvatarFallback className="text-[10px]">{msg.senderName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          {msg.body}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  data-testid="input-message"
                />
                <Button onClick={handleSend} disabled={sendMsg.isPending || !message.trim()} size="icon" data-testid="button-send-message">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
