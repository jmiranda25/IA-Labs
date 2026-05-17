import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout";
import { useListCourses } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { BookOpen, Lock, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseDetail } from "@workspace/api-client-react";

function CourseCard({ course }: { course: CourseDetail }) {
  const hasPurchase = !!course.purchase;
  const purchaseStatus = course.purchase?.status;

  return (
    <Link href={`/cursos/${course.slug}`}>
      <div className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
        {course.coverUrl ? (
          <img
            src={course.coverUrl}
            alt={course.title}
            className="w-full h-40 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-primary/40" />
          </div>
        )}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {course.title}
            </h3>
            {course.hasAccess ? (
              <Badge className="shrink-0 bg-green-600 text-white">
                <CheckCircle className="h-3 w-3 mr-1" />
                Acceso
              </Badge>
            ) : hasPurchase && purchaseStatus === "pending" ? (
              <Badge variant="secondary" className="shrink-0">
                <Clock className="h-3 w-3 mr-1" />
                Pendiente
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 text-primary border-primary/40">
                S/ {Number(course.pricePen).toFixed(2)}
              </Badge>
            )}
          </div>
          {course.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {course.description}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>{course.moduleCount} módulo{course.moduleCount !== 1 ? "s" : ""}</span>
            <span>Por {course.creatorName}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CourseCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Skeleton className="w-full h-40" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export default function CursosPage() {
  const { data, isLoading } = useListCourses();
  const courses = (data as CourseDetail[] | undefined) ?? [];

  return (
    <Layout>
      <Helmet>
        <title>Cursos · AI Community</title>
        <meta name="description" content="Aprende con los mejores cursos de IA de nuestra comunidad." />
      </Helmet>

      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cursos</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Cursos creados y curados por el equipo de IA Labs. Paga con Yape y activamos tu acceso.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2">
            <Lock className="h-3.5 w-3.5" />
            Pago validado manualmente
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">No hay cursos disponibles aún</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Vuelve pronto, estamos preparando contenido increíble.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
