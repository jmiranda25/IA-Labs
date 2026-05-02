import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useListForumCategories } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { MessageSquare, Hash, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const COLOR_CLASSES: Record<string, { dot: string; badge: string }> = {
  blue:   { dot: "bg-blue-500",   badge: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  purple: { dot: "bg-purple-500", badge: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
  green:  { dot: "bg-green-500",  badge: "bg-green-500/10 text-green-400 border border-green-500/20" },
  red:    { dot: "bg-red-500",    badge: "bg-red-500/10 text-red-400 border border-red-500/20" },
  orange: { dot: "bg-orange-500", badge: "bg-orange-500/10 text-orange-400 border border-orange-500/20" },
  yellow: { dot: "bg-yellow-500", badge: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" },
  pink:   { dot: "bg-pink-500",   badge: "bg-pink-500/10 text-pink-400 border border-pink-500/20" },
  cyan:   { dot: "bg-cyan-500",   badge: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" },
};
function colorClasses(color: string) {
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.blue;
}

export default function ForoPage() {
  const { data: categories, isLoading, isError } = useListForumCategories();

  return (
    <Layout>
      <Helmet>
        <title>Foro — AI Community</title>
        <meta name="description" content="Discusiones, preguntas y debate sobre inteligencia artificial en español. Únete a la comunidad hispanohablante de IA." />
        <meta property="og:title" content="Foro — AI Community" />
        <meta property="og:description" content="Discusiones y debate sobre IA en español." />
      </Helmet>
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Foro</h1>
          <p className="text-sm text-muted-foreground">Discusiones de la comunidad</p>
        </div>
      </div>

      {/* Category list */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
          No se pudieron cargar las categorías.
        </div>
      )}

      {categories && categories.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
          Aún no hay categorías en el foro.
        </div>
      )}

      {categories && categories.length > 0 && (
        <div className="space-y-3">
          {categories.map((cat) => {
            const cls = colorClasses(cat.color);
            return (
              <Link key={cat.id} href={`/foro/${cat.slug}`}>
                <div className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
                  {/* Color indicator */}
                  <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${cls.dot}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {cat.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cls.badge}`}>
                        {cat.color}
                      </span>
                    </div>
                    {cat.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  {/* Counts */}
                  <div className="flex gap-4 text-sm text-muted-foreground flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" />
                      {cat.threadCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {cat.postCount}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
    </Layout>
  );
}
