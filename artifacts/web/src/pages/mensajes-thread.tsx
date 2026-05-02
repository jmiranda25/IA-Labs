import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import {
  useGetMessageThread,
  useSendListingMessage,
  useGetMe,
  useGetMarketplaceListing,
  getGetMessageThreadQueryKey,
  getListMessageThreadsQueryKey,
  getGetMarketplaceListingQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Send, MessageCircle, ChevronLeft, ShoppingBag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function MensajesThreadPage({
  listingId,
  otherUserId,
}: {
  listingId: string;
  otherUserId: string;
}) {
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: me } = useGetMe();
  const { data: messagesRaw, isLoading } = useGetMessageThread(listingId, otherUserId, {
    query: { queryKey: getGetMessageThreadQueryKey(listingId, otherUserId) },
  });
  const msgs = (messagesRaw as any[]) ?? [];

  // Fetch listing info to get slug for the "Back to listing" link
  // We need to find what listing this is — we'll look it up via listingId across my threads
  // (listing detail endpoint uses slug, not id — use a lighter approach via threads context)
  const send = useSendListingMessage();

  // Auto-scroll to bottom whenever messages load or new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  // Re-fetch when SSE fires a message from this conversation
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === "message_received") {
        qc.invalidateQueries({ queryKey: getGetMessageThreadQueryKey(listingId, otherUserId) });
        qc.invalidateQueries({ queryKey: getListMessageThreadsQueryKey() });
      }
    };
    window.addEventListener("sse-notification", handler);
    return () => window.removeEventListener("sse-notification", handler);
  }, [qc, listingId, otherUserId]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const body = message.trim();
    setMessage("");
    try {
      // We need the listing slug — derive from the first message's listingId by fetching all threads
      // Alternatively, send to backend using listingId and find slug there
      // We store listingId as the route param; backend uses listingId for messages/:slug route
      // But our route is POST /marketplace/listings/:slug/messages — we need slug.
      // Let's do a quick lookup from threads cache
      const threads = (qc.getQueryData<any[]>(getListMessageThreadsQueryKey()) ?? []) as any[];
      const thread = threads.find((t: any) => t.listingId === listingId && t.otherUserId === otherUserId);
      const slug = thread?.listingSlug;
      if (!slug) { toast.error("No se pudo identificar el anuncio"); setMessage(body); return; }

      await send.mutateAsync({ slug, data: { body, toId: otherUserId } });
      qc.invalidateQueries({ queryKey: getGetMessageThreadQueryKey(listingId, otherUserId) });
      qc.invalidateQueries({ queryKey: getListMessageThreadsQueryKey() });
    } catch {
      toast.error("Error al enviar");
      setMessage(body);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Find other user info from messages
  const otherUserMsg = msgs.find((m: any) => m.fromId === otherUserId);
  const otherName = otherUserMsg?.fromName ?? "Vendedor";
  const otherAvatar = otherUserMsg?.fromAvatar ?? null;

  // Find listing slug from threads in cache
  const threads = (qc.getQueryData<any[]>(getListMessageThreadsQueryKey()) ?? []) as any[];
  const thread = threads.find((t: any) => t.listingId === listingId);
  const listingTitle = thread?.listingTitle ?? "";
  const listingSlug = thread?.listingSlug ?? "";

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <Link href="/mensajes">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Avatar className="h-9 w-9">
            <AvatarImage src={otherAvatar} />
            <AvatarFallback>{otherName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{otherName}</p>
            {listingTitle && (
              <p className="text-xs text-muted-foreground truncate">
                Re:{" "}
                {listingSlug ? (
                  <Link href={`/marketplace/${listingSlug}`} className="hover:text-primary transition-colors">
                    {listingTitle}
                  </Link>
                ) : listingTitle}
              </p>
            )}
          </div>
          {listingSlug && (
            <Link href={`/marketplace/${listingSlug}`}>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                <ShoppingBag className="h-3.5 w-3.5" />Ver anuncio
              </Button>
            </Link>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}
            </div>
          ) : msgs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Sé el primero en escribir.</p>
            </div>
          ) : (
            msgs.map((msg: any) => {
              const isMine = msg.fromId === me?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}
                >
                  {!isMine && (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={msg.fromAvatar} />
                      <AvatarFallback className="text-[10px]">{msg.fromName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    <p>{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: es })}
                      {isMine && msg.readAt && <span className="ml-1">· Leído</span>}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="flex gap-2 mt-3 shrink-0">
          <Input
            placeholder="Escribe un mensaje..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={send.isPending}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={send.isPending || !message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
