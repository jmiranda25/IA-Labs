import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetForumPost, useCreateForumReply, useToggleForumReaction, useDeleteForumPost, useDeleteForumReply, getGetForumPostQueryKey } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Pin, Lock, Trash2, CornerDownRight } from "lucide-react";

const EMOJIS = ["👍", "❤️", "🔥", "🚀", "💡", "🤔"];

function ReactionBar({ targetType, targetId, reactions, onToggle }: { targetType: string; targetId: string; reactions: any[]; onToggle: (emoji: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {EMOJIS.map((emoji) => {
        const r = reactions.find((rx: any) => rx.emoji === emoji);
        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${r?.hasReacted ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            data-testid={`reaction-${emoji}-${targetId}`}
          >
            <span>{emoji}</span>
            {r?.count ? <span>{r.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function ReplyItem({ reply, postId, onRefresh, me }: { reply: any; postId: string; onRefresh: () => void; me: any }) {
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);
  const createReply = useCreateForumReply();
  const toggleReaction = useToggleForumReaction();
  const deleteReply = useDeleteForumReply();
  const qc = useQueryClient();

  const handleReply = () => {
    createReply.mutate({ postId, data: { body: replyText, parentReplyId: reply.id } }, {
      onSuccess: () => { setReplyText(""); setShowReply(false); onRefresh(); },
    });
  };

  const handleReaction = (emoji: string) => {
    toggleReaction.mutate({ data: { targetType: "reply", targetId: reply.id, emoji } }, { onSuccess: onRefresh });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3" data-testid={`reply-${reply.id}`}>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={reply.authorAvatar} />
          <AvatarFallback className="text-xs">{reply.authorName?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">{reply.authorName}</span>
              <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{reply.body}</p>
          </div>
          <div className="flex items-center gap-3 mt-2 px-1">
            <ReactionBar targetType="reply" targetId={reply.id} reactions={reply.reactions ?? []} onToggle={handleReaction} />
            <button className="text-xs text-muted-foreground hover:text-primary transition-colors" onClick={() => setShowReply(!showReply)} data-testid={`button-reply-${reply.id}`}>
              <CornerDownRight className="h-3.5 w-3.5 inline mr-1" />Reply
            </button>
            {me?.id === reply.authorId && (
              <button className="text-xs text-destructive hover:opacity-80" onClick={() => deleteReply.mutate({ replyId: reply.id }, { onSuccess: onRefresh })} data-testid={`button-delete-reply-${reply.id}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {showReply && (
            <div className="mt-2 flex gap-2">
              <Textarea placeholder="Write a reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} className="text-sm" data-testid={`input-nested-reply-${reply.id}`} />
              <Button size="sm" onClick={handleReply} disabled={!replyText.trim()} data-testid={`button-submit-nested-reply-${reply.id}`}>Post</Button>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {reply.children?.length > 0 && (
        <div className="ml-11 border-l-2 border-border pl-4 space-y-3">
          {reply.children.map((child: any) => (
            <ReplyItem key={child.id} reply={child} postId={postId} onRefresh={onRefresh} me={me} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ForumPostPage({ postId }: { postId: string }) {
  const qc = useQueryClient();
  const { data: post, isLoading } = useGetForumPost(postId, { query: { queryKey: getGetForumPostQueryKey(postId) } });
  const { data: me } = useGetMe();
  const createReply = useCreateForumReply();
  const toggleReaction = useToggleForumReaction();
  const deletePost = useDeleteForumPost();
  const [replyText, setReplyText] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: getGetForumPostQueryKey(postId) });

  const handleReply = () => {
    createReply.mutate({ postId, data: { body: replyText } }, {
      onSuccess: () => { setReplyText(""); refresh(); },
    });
  };

  const handleReaction = (emoji: string) => {
    toggleReaction.mutate({ data: { targetType: "post", targetId: postId, emoji } }, { onSuccess: refresh });
  };

  if (isLoading) return <Layout><div className="max-w-3xl mx-auto p-6"><Skeleton className="h-96 rounded-xl" /></div></Layout>;
  if (!post) return <Layout><div className="p-6 text-center text-muted-foreground">Post not found.</div></Layout>;

  const p = post as any;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            {/* Post header */}
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={p.authorAvatar} />
                <AvatarFallback>{p.authorName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {p.isPinned && <Pin className="h-4 w-4 text-primary" />}
                  {p.isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                  <h1 className="text-xl font-bold text-foreground" data-testid="text-post-title">{p.title}</h1>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{p.authorName}</span>
                  {p.categoryName && <Badge variant="secondary" className="text-[10px] px-1.5">{p.categoryName}</Badge>}
                  <span>{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
              {me?.id === p.authorId && (
                <button onClick={() => deletePost.mutate({ postId }, { onSuccess: () => history.back() })} className="text-destructive hover:opacity-80 shrink-0" data-testid="button-delete-post">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed mb-4">{p.body}</p>

            <ReactionBar targetType="post" targetId={postId} reactions={p.reactions ?? []} onToggle={handleReaction} />
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            {p.replies?.length ?? 0} Replies
          </h2>

          {/* Reply box */}
          {!p.isLocked && (
            <Card>
              <CardContent className="p-4">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  className="mb-3"
                  data-testid="input-reply"
                />
                <Button onClick={handleReply} disabled={!replyText.trim() || createReply.isPending} data-testid="button-submit-reply">
                  {createReply.isPending ? "Posting..." : "Post Reply"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Replies list */}
          {p.replies?.map((reply: any) => (
            <ReplyItem key={reply.id} reply={reply} postId={postId} onRefresh={refresh} me={me as any} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
