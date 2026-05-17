import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout";
import { useListCourses } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { BookOpen, Lock, CheckCircle, Clock } from "lucide-react";
import type { CourseDetail } from "@workspace/api-client-react";

function CourseCard({ course }: { course: CourseDetail }) {
  const hasPurchase = !!course.purchase;
  const purchaseStatus = course.purchase?.status;

  const statusBadge = course.hasAccess ? (
    <span className="inline-flex items-center gap-1 rounded-none bg-green-500 text-black text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
      <CheckCircle className="h-2.5 w-2.5" />
      Acceso
    </span>
  ) : hasPurchase && purchaseStatus === "pending" ? (
    <span className="inline-flex items-center gap-1 rounded-none bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
      <Clock className="h-2.5 w-2.5" />
      Pendiente
    </span>
  ) : (
    <span className="rounded-none bg-[#c8f135] text-black text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
      S/ {Number(course.pricePen).toFixed(0)}
    </span>
  );

  return (
    <Link href={`/cursos/${course.slug}`}>
      <div className="group relative overflow-hidden cursor-pointer h-60 transition-transform hover:scale-[1.03] duration-300">
        {/* Full-bleed cover */}
        {course.coverUrl ? (
          <img
            src={course.coverUrl}
            alt={course.title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/10 flex items-center justify-center">
            <BookOpen className="h-14 w-14 text-primary/20" />
          </div>
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Price / status badge — top right */}
        <div className="absolute top-3 right-3">
          {statusBadge}
        </div>

        {/* Title + meta — bottom left */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
          <h3 className="font-light text-white text-base leading-snug line-clamp-2">
            {course.title}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/50">
              {course.moduleCount} módulo{course.moduleCount !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/50">
              {course.creatorName}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CourseCardSkeleton() {
  return <Skeleton className="h-60 w-full" />;
}

export default function CursosPage() {
  const { data, isLoading } = useListCourses();
  const courses = (data as CourseDetail[] | undefined) ?? [];

  return (
    <Layout>
      <Helmet>
        <title>Cursos · IA Labs</title>
        <meta name="description" content="Aprende con los mejores cursos de IA de nuestra comunidad." />
      </Helmet>

      <div className="max-w-5xl mx-auto py-8 px-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-foreground">Cursos</h1>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-2">
              Curados por el equipo · Paga con Yape
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground border border-border/50 px-3 py-2">
            <Lock className="h-3 w-3" />
            Validado manualmente
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
            <BookOpen className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-light text-lg">No hay cursos disponibles aún</p>
            <p className="text-white/30 text-[11px] uppercase tracking-widest mt-2">Vuelve pronto</p>
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
