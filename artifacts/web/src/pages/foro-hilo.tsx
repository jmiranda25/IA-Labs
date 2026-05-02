import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetForumThread,
  getGetForumThreadQueryKey,
  getListForumCategoriesQueryKey,
  useCreateForumPost,
  useUpdateForumPost,
  useDeleteForumPost,
  useUpdateForumThread,
  useDeleteForumThread,
  useToggleForumReaction,
  useAdminPinThread,
  useAdminLockThread,
  type ForumPostWithAuthor,
} from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import {
  ArrowLeft,
  Pin,
  Lock,
  Loader2,
  Trash2,
  Pencil,
  MoreHorizontal,
  Send,
  Unlock,
  PinOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const EMOJIS = ["👍", "❤️", "🔥", "🚀", "💡", "🤔"];
const EDIT_WINDOW_MS = 15 * 60 * 1000;

function canEdit(authorId: string, myId: string, createdAt: string, isAdmin: boolean) {
  if (isAdmin) return true;
  if (authorId !== myId) return false;
  return Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS;
}

interface Props {
  categorySlug: string;
  threadId: string;
}

interface PostCardProps {
  post: ForumPostWithAuthor;
  myId: string;
  isAdmin: boolean;
  threadId: string;
  onReactionToggle: (postId: string, emoji: string) => void;
  onDelete: (postId: string) => void;
  onEdit: (post: ForumPostWithAuthor) => void;
  isLocked: boolean;
}

function PostCard({ post, myId, isAdmin, threadId, onReactionToggle, onDelete, onEdit, isLocked }: PostCardProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const editable = canEdit(post.authorId, myId, post.createdAt as unknown as string, isAdmin);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      {/* Author row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {post.authorAvatar && <AvatarImage src={post.authorAvatar} />}
            <AvatarFallback className="text-xs">
              {(post.authorName ?? "A").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{post.authorName}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt as unknown as string), {
                addSuffix: true,
                locale: es,
              })}
              {post.editedAt && " · editado"}
            </p>
          </div>
        </div>

        {/* Actions */}
        {(editable || isAdmin) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {editable && (
                <DropdownMenuItem onClick={() => onEdit(post)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {(post.authorId === myId || isAdmin) && (
                <>
                  {editable && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(post.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Body */}
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {post.body}
      </p>

      {/* Reactions */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {post.reactions
          .filter((r) => r.count > 0)
          .map((r) => (
            <button
              key={r.emoji}
              onClick={() => !isLocked && onReactionToggle(post.id, r.emoji)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-colors ${
                r.hasReacted
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "bg-muted/50 border-border text-muted-foreground hover:border-primary/30"
              } ${isLocked ? "cursor-default opacity-60" : "cursor-pointer"}`}
            >
              {r.emoji} {r.count}
            </button>
          ))}
        {!isLocked && (
          <div className="relative">
            <button
              onClick={() => setEmojiOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              +
            </button>
            {emojiOpen && (
              <div className="absolute bottom-8 left-0 z-50 flex gap-1 rounded-lg border border-border bg-popover p-2 shadow-lg">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    className="text-base hover:scale-125 transition-transform"
                    onClick={() => {
                      onReactionToggle(post.id, e);
                      setEmojiOpen(false);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForoHiloPage({ categorySlug, threadId }: Props) {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const myId = user?.id ?? "";
  const isAdmin = (user?.publicMetadata?.isAdmin as boolean) ?? false;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [replyBody, setReplyBody] = useState("");
  const [editingPost, setEditingPost] = useState<ForumPostWithAuthor | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editingThread, setEditingThread] = useState(false);
  const [editThreadTitle, setEditThreadTitle] = useState("");
  const [editThreadBody, setEditThreadBody] = useState("");

  const { data: thread, isLoading, isError } = useGetForumThread(threadId, {
    query: { enabled: !!threadId },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetForumThreadQueryKey(threadId) });
    qc.invalidateQueries({ queryKey: getListForumCategoriesQueryKey() });
  }

  const createPost = useCreateForumPost({
    mutation: {
      onSuccess: () => { setReplyBody(""); invalidate(); },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast({
          title: msg === "thread_locked" ? "Este tema está cerrado" : "Error al publicar",
          variant: "destructive",
        });
      },
    },
  });

  const updatePost = useUpdateForumPost({
    mutation: {
      onSuccess: () => { setEditingPost(null); invalidate(); },
      onError: () => toast({ title: "Error al editar", variant: "destructive" }),
    },
  });

  const deletePost = useDeleteForumPost({
    mutation: {
      onSuccess: invalidate,
      onError: () => toast({ title: "Error al eliminar", variant: "destructive" }),
    },
  });

  const updateThread = useUpdateForumThread({
    mutation: {
      onSuccess: () => { setEditingThread(false); invalidate(); },
      onError: () => toast({ title: "Error al editar el tema", variant: "destructive" }),
    },
  });

  const deleteThread = useDeleteForumThread({
    mutation: {
      onSuccess: () => navigate(`/foro/${categorySlug}`),
      onError: () => toast({ title: "Error al eliminar el tema", variant: "destructive" }),
    },
  });

  const toggleReaction = useToggleForumReaction({
    mutation: { onSuccess: invalidate },
  });

  const pinThread = useAdminPinThread({
    mutation: { onSuccess: invalidate },
  });

  const lockThread = useAdminLockThread({
    mutation: { onSuccess: invalidate },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full rounded-xl" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  if (isError || !thread) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-destructive">
        No se pudo cargar el tema.
      </div>
    );
  }

  const authorCanEdit = canEdit(thread.authorId, myId, thread.createdAt as unknown as string, isAdmin);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href={`/foro/${categorySlug}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {thread.pinned && <Pin className="h-4 w-4 text-amber-400" />}
            {thread.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
            {editingThread ? (
              <input
                className="text-xl font-bold bg-transparent border-b border-primary focus:outline-none w-full text-foreground"
                value={editThreadTitle}
                onChange={(e) => setEditThreadTitle(e.target.value)}
                autoFocus
              />
            ) : (
              <h1 className="text-xl font-bold text-foreground">{thread.title}</h1>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Por {thread.authorName} ·{" "}
            {formatDistanceToNow(new Date(thread.createdAt as unknown as string), {
              addSuffix: true,
              locale: es,
            })}
            {" · "}
            <Link href={`/foro/${categorySlug}`} className="hover:text-primary">
              {thread.categorySlug}
            </Link>
          </p>
        </div>

        {/* Thread actions */}
        {(authorCanEdit || isAdmin) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {authorCanEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditThreadTitle(thread.title);
                    setEditThreadBody(thread.body);
                    setEditingThread(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar tema
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => pinThread.mutate({ threadId })}>
                    {thread.pinned ? (
                      <><PinOff className="mr-2 h-4 w-4" />Quitar pin</>
                    ) : (
                      <><Pin className="mr-2 h-4 w-4" />Fijar tema</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => lockThread.mutate({ threadId })}>
                    {thread.locked ? (
                      <><Unlock className="mr-2 h-4 w-4" />Abrir tema</>
                    ) : (
                      <><Lock className="mr-2 h-4 w-4" />Cerrar tema</>
                    )}
                  </DropdownMenuItem>
                </>
              )}
              {(thread.authorId === myId || isAdmin) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("¿Eliminar este tema?"))
                        deleteThread.mutate({ threadId });
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar tema
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Thread body (OP) */}
      <div className="rounded-xl border border-border bg-card/50 p-5">
        {editingThread ? (
          <div className="space-y-3">
            <Textarea
              value={editThreadBody}
              onChange={(e) => setEditThreadBody(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingThread(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={updateThread.isPending}
                onClick={() =>
                  updateThread.mutate({
                    threadId,
                    data: { title: editThreadTitle, body: editThreadBody },
                  })
                }
              >
                {updateThread.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {thread.body}
          </p>
        )}
      </div>

      {/* Posts */}
      {thread.posts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            {thread.postCount} {thread.postCount === 1 ? "respuesta" : "respuestas"}
          </p>
          {thread.posts.map((post) =>
            editingPost?.id === post.id ? (
              <div key={post.id} className="rounded-xl border border-primary/30 bg-card p-5 space-y-3">
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={4}
                  className="resize-none"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setEditingPost(null)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    disabled={updatePost.isPending}
                    onClick={() =>
                      updatePost.mutate({ postId: post.id, data: { body: editBody } })
                    }
                  >
                    {updatePost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <PostCard
                key={post.id}
                post={post}
                myId={myId}
                isAdmin={isAdmin}
                threadId={threadId}
                isLocked={thread.locked}
                onReactionToggle={(postId, emoji) =>
                  toggleReaction.mutate({ postId, data: { emoji } })
                }
                onDelete={(postId) => {
                  if (confirm("¿Eliminar esta respuesta?"))
                    deletePost.mutate({ postId });
                }}
                onEdit={(p) => {
                  setEditingPost(p);
                  setEditBody(p.body);
                }}
              />
            )
          )}
        </div>
      )}

      {/* Reply composer */}
      {thread.locked ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          Este tema está cerrado para nuevas respuestas.
        </div>
      ) : user ? (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm font-medium text-foreground">Tu respuesta</p>
          <Textarea
            placeholder="Escribe tu respuesta..."
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              disabled={createPost.isPending || !replyBody.trim()}
              onClick={() =>
                createPost.mutate({ threadId, data: { body: replyBody } })
              }
              className="gap-2"
            >
              {createPost.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publicar respuesta
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card/50 p-5 text-center text-sm text-muted-foreground">
          Inicia sesión para participar en la discusión.
        </div>
      )}
    </div>
  );
}
