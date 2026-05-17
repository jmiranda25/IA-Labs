import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useListForumCategories } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const COLOR_BORDER: Record<string, string> = {
  blue:   "border-blue-500",
  purple: "border-purple-500",
  green:  "border-green-500",
  red:    "border-red-500",
  orange: "border-orange-500",
  yellow: "border-yellow-400",
  pink:   "border-pink-500",
  cyan:   "border-cyan-500",
};
function borderColor(color: string) {
  return COLOR_BORDER[color] ?? COLOR_BORDER.blue;
}

export default function ForoPage() {
  const { data: categories, isLoading, isError } = useListForumCategories();

  return (
    <Layout>
      <Helmet>
        <title>Foro — IA Labs</title>
        <meta name="description" content="Discusiones, preguntas y debate sobre inteligencia artificial en español. Únete a la comunidad hispanohablante de IA." />
        <meta property="og:title" content="Foro — IA Labs" />
        <meta property="og:description" content="Discusiones y debate sobre IA en español." />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-light tracking-tight text-foreground">Foro</h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-2">Discusiones de la comunidad</p>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <div className="border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive text-sm">
            No se pudieron cargar las categorías.
          </div>
        )}

        {categories && categories.length === 0 && (
          <div className="border border-border p-10 text-center text-muted-foreground text-sm">
            Aún no hay categorías en el foro.
          </div>
        )}

        {categories && categories.length > 0 && (
          <div className="space-y-0 divide-y divide-border/50">
            {categories.map((cat) => {
              const bc = borderColor(cat.color);
              return (
                <Link key={cat.id} href={`/foro/${cat.slug}`}>
                  <div className={`group flex items-start gap-0 border-l-[3px] ${bc} bg-transparent hover:bg-white/5 transition-colors cursor-pointer px-5 py-5`}>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <span className="text-lg font-light text-foreground group-hover:text-primary transition-colors">
                        {cat.name}
                      </span>
                      {cat.description && (
                        <p className="mt-1 text-sm text-white/50 line-clamp-1">
                          {cat.description}
                        </p>
                      )}
                    </div>

                    {/* Counts — right-aligned */}
                    <div className="flex flex-col items-end gap-0.5 text-right shrink-0 ml-6">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {cat.threadCount} temas
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {cat.postCount} posts
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
