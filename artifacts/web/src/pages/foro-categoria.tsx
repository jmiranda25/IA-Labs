import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  listForumThreads,
  getListForumThreadsQueryKey,
  useCreateForumThread,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Pin,
  Lock,
  PlusCircle,
  Loader2,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  slug: string;
}

export default function ForoCategoriaPage({ slug }: Props) {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [...getListForumThreadsQueryKey(slug, {}), "infinite"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      listForumThreads(slug, { cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!slug,
  });

  const createThread = useCreateForumThread({
    mutation: {
      onSuccess: (thread) => {
        qc.invalidateQueries({ queryKey: getListForumThreadsQueryKey(slug) });
        setOpen(false);
        setTitle("");
        setBody("");
        navigate(`/foro/${slug}/${thread.id}`);
      },
      onError: () => {
        toast({ title: "Error al crear el tema", variant: "destructive" });
      },
    },
  });

  const allPages = data?.pages ?? [];
  const categoryName = allPages[0]?.categoryName ?? slug;
  const categoryColor = allPages[0]?.categoryColor ?? "blue";
  const allThreads = allPages.flatMap((p) => p.items);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    createThread.mutate({ data: { categorySlug: slug, title, body } });
  }

  return (
    <Layout>
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/foro">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Volver al foro">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{categoryName}</h1>
            <p className="text-xs text-muted-foreground">Foro › {categoryName}</p>
          </div>
        </div>
        {isAuthenticated && (
          <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Nuevo tema
          </Button>
        )}
      </div>

      {/* Thread list */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
          No se pudieron cargar los temas.
        </div>
      )}

      {!isLoading && allThreads.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          <MessageSquare className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p>Aún no hay temas en esta categoría.</p>
          {isAuthenticated && (
            <Button size="sm" className="mt-4 gap-2" onClick={() => setOpen(true)}>
              <PlusCircle className="h-4 w-4" />
              Crear el primer tema
            </Button>
          )}
        </div>
      )}

      {allThreads.length > 0 && (
        <div className="space-y-2">
          {allThreads.map((thread) => (
            <Link key={thread.id} href={`/foro/${slug}/${thread.id}`}>
              <div className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {thread.pinned && (
                      <Pin className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                    )}
                    {thread.locked && (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {thread.title}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>Por {thread.authorName}</span>
                    <span>·</span>
                    <span>
                      {formatDistanceToNow(new Date(thread.lastActivityAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-foreground">{thread.postCount}</p>
                  <p className="text-xs text-muted-foreground">respuestas</p>
                </div>
              </div>
            </Link>
          ))}

          {/* Load more */}
          {hasNextPage && (
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Cargar más
              </Button>
            </div>
          )}
        </div>
      )}

      {/* New thread dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo tema en {categoryName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="thread-title">Título</Label>
              <Input
                id="thread-title"
                placeholder="Escribe un título claro y descriptivo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="thread-body">Contenido</Label>
              <Textarea
                id="thread-body"
                placeholder="Explica tu idea, pregunta o tema..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createThread.isPending || !title.trim() || !body.trim()}
              >
                {createThread.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Publicar tema
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </Layout>
  );
}
