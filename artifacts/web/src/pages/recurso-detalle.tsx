import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { useGetResource } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  ExternalLink,
  FileDown,
  GraduationCap,
  Link2,
  Tag as TagIcon,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

export default function RecursoDetallePage({ slug }: { slug: string }) {
  const { data, isLoading, error } = useGetResource(slug);
  const r = data as any;

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32" />
        </div>
      </Layout>
    );
  }

  if (error || !r) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto p-6 text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Recurso no encontrado</p>
          <Link href="/recursos">
            <Button variant="ghost" className="mt-4 gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Volver a recursos
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const ctaHref =
    r.type === "file"
      ? r.filePath ?? r.url ?? "#"
      : r.url ?? "#";

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6">
        {/* Back */}
        <Link href="/recursos">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-5 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Recursos
          </Button>
        </Link>

        {/* Cover */}
        {r.coverUrl && (
          <div className="h-52 sm:h-64 overflow-hidden rounded-xl mb-6 border border-border/40">
            <img
              src={r.coverUrl}
              alt={r.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Title row */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${TYPE_COLORS[r.type] ?? "bg-muted"}`}
          >
            <TypeIcon type={r.type} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge
                variant="outline"
                className={`text-xs border ${TYPE_COLORS[r.type] ?? ""}`}
              >
                {TYPE_LABELS[r.type] ?? r.type}
              </Badge>
              {!r.published && (
                <Badge
                  variant="outline"
                  className="text-xs border-yellow-500/30 text-yellow-400"
                >
                  En revisión
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {r.title}
            </h1>
          </div>
        </div>

        {/* Author + date */}
        <div className="flex items-center gap-3 mb-5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              {r.authorAvatar ? (
                <img src={r.authorAvatar} alt={r.authorName} />
              ) : (
                <AvatarFallback className="text-[10px]">
                  {r.authorName?.charAt(0)?.toUpperCase() ?? "?"}
                </AvatarFallback>
              )}
            </Avatar>
            <span>{r.authorName}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(r.createdAt), "d MMM yyyy", { locale: es })}
          </span>
        </div>

        {/* Tags */}
        {r.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {r.tags.map((t: string) => (
              <Link key={t} href={`/recursos?tags=${encodeURIComponent(t)}`}>
                <span className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors flex items-center gap-1">
                  <TagIcon className="h-2.5 w-2.5" />
                  {t}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        {ctaHref !== "#" && (
          <div className="mb-6">
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              download={r.type === "file" ? true : undefined}
            >
              <Button className="gap-2">
                {r.type === "file" ? (
                  <>
                    <FileDown className="h-4 w-4" />
                    Descargar
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Abrir
                  </>
                )}
              </Button>
            </a>
          </div>
        )}

        <Separator className="mb-6" />

        {/* Description */}
        {r.description ? (
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-accent">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {r.description}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-muted-foreground italic text-sm">
            Sin descripción.
          </p>
        )}
      </div>
    </Layout>
  );
}
