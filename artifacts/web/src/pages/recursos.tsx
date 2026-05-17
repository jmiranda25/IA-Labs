import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { listResources } from "@workspace/api-client-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Link2,
  FileDown,
  GraduationCap,
  Search,
  Plus,
  Tag as TagIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const TYPE_TABS = [
  { value: "", label: "Todos", icon: BookOpen },
  { value: "link", label: "Enlaces", icon: Link2 },
  { value: "file", label: "Archivos", icon: FileDown },
  { value: "course", label: "Cursos", icon: GraduationCap },
] as const;

const TYPE_COLORS: Record<string, string> = {
  link: "bg-accent/10 text-accent border-accent/20",
  file: "bg-primary/10 text-primary border-primary/20",
  course: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const TYPE_LABELS: Record<string, string> = {
  link: "Enlace",
  file: "Archivo",
  course: "Curso",
};

function TypeIcon({ type }: { type: string }) {
  if (type === "link") return <Link2 className="h-4 w-4" />;
  if (type === "file") return <FileDown className="h-4 w-4" />;
  return <GraduationCap className="h-4 w-4" />;
}

function ResourceCard({ r }: { r: any }) {
  return (
    <Link href={`/recursos/${r.slug}`}>
      <div className="relative overflow-hidden cursor-pointer h-64 sm:h-72 transition-transform hover:-translate-y-0.5">
        {/* Full-bleed background */}
        {r.coverUrl ? (
          <img
            src={r.coverUrl}
            alt={r.title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
            <TypeIcon type={r.type} />
          </div>
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Type badge — top right */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {!r.published && (
            <span className="inline-block rounded-none bg-yellow-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-black">
              Pendiente
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-none bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-secondary-foreground">
            <TypeIcon type={r.type} />
            {TYPE_LABELS[r.type] ?? r.type}
          </span>
        </div>

        {/* Content — bottom left */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-2xl font-light text-white leading-snug line-clamp-2 mb-2">
            {r.title}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span className="truncate">{r.authorName}</span>
            {r.tags?.length > 0 && (
              <span className="flex items-center gap-1">
                <TagIcon className="h-3 w-3 shrink-0" />
                {r.tags.slice(0, 2).join(", ")}
              </span>
            )}
            <span className="shrink-0">
              {formatDistanceToNow(new Date(r.createdAt), {
                addSuffix: true,
                locale: es,
              })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RecursosPage() {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );

  const [q, setQ] = useState(params.get("q") ?? "");
  const [type, setType] = useState(params.get("type") ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    params.get("tags") ? params.get("tags")!.split(",") : [],
  );

  const debouncedQ = useDebounce(q, 300);
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });

  // sync URL params
  useEffect(() => {
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (type) p.set("type", type);
    if (selectedTags.length) p.set("tags", selectedTags.join(","));
    const qs = p.toString();
    setLocation(`/recursos${qs ? `?${qs}` : ""}`, { replace: true });
  }, [debouncedQ, type, selectedTags]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ["resources-infinite", debouncedQ, type, selectedTags.join(",")],
    queryFn: ({ pageParam }) =>
      listResources({
        q: debouncedQ || undefined,
        type: (type as "link" | "file" | "course") || undefined,
        tags: selectedTags.length ? selectedTags.join(",") : undefined,
        cursor: (pageParam as string) || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage]);

  const resources = data?.pages.flatMap((p: any) => p.resources ?? []) ?? [];

  // collect known tags from current results for tag chips
  const tagCounts: Record<string, number> = {};
  resources.forEach((r: any) => {
    r.tags?.forEach((t: string) => {
      tagCounts[t] = (tagCounts[t] ?? 0) + 1;
    });
  });
  const popularTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag]) => tag);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>Recursos de IA — IA Labs</title>
        <meta name="description" content="Tutoriales, herramientas y cursos de inteligencia artificial compartidos por la comunidad hispanohablante." />
        <meta property="og:title" content="Recursos de IA — IA Labs" />
        <meta property="og:description" content="Tutoriales, herramientas y cursos de IA compartidos por la comunidad." />
      </Helmet>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Recursos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Tutoriales, herramientas y cursos compartidos por la comunidad.
            </p>
          </div>
          <Link href="/recursos/nuevo">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              Compartir
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar recursos..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Type tabs */}
        <Tabs
          value={type}
          onValueChange={(v) => setType(v)}
          className="mb-4"
        >
          <TabsList className="h-9">
            {TYPE_TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Tag chips */}
        {(popularTags.length > 0 || selectedTags.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {[
              ...new Set([...selectedTags, ...popularTags]),
            ].slice(0, 14).map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs px-2.5 py-1 rounded-full border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No se encontraron recursos</p>
            <p className="text-sm mt-1">
              Sé el primero en compartir uno.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((r: any) => (
                <ResourceCard key={r.id} r={r} />
              ))}
            </div>
            <div ref={loadMoreRef} className="py-6 flex justify-center">
              {isFetchingNextPage && (
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
