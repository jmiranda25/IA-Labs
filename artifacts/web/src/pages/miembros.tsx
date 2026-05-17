import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { listUsers } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Search, Users, Loader2 } from "lucide-react";

type RoleFilter = "" | "participant" | "administrator";

export default function MiembrosPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("");
  const debouncedSearch = useDebounce(search, 300);

  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["miembros", { q: debouncedSearch, role }],
    queryFn: ({ pageParam }) =>
      listUsers({
        q: debouncedSearch || undefined,
        role: (role || undefined) as "participant" | "administrator" | undefined,
        cursor: (pageParam as string | undefined) ?? undefined,
        limit: 24,
      }),
    getNextPageParam: (lastPage) => (lastPage as any).nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allUsers = data?.pages.flatMap((page) => (page as any).items) ?? [];

  return (
    <Layout>
      <Helmet>
        <title>Directorio de miembros — AI Community</title>
        <meta name="description" content="Conecta con builders, founders y profesionales de IA de toda la comunidad hispanohablante." />
        <meta property="og:title" content="Directorio de miembros — AI Community" />
        <meta property="og:description" content="Conecta con practicantes de IA de toda la comunidad hispanohablante." />
      </Helmet>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-light tracking-tight text-foreground flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" />
            Directorio
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-2">
            Conecta con practicantes de IA de toda la comunidad
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nombre o usuario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-member-search"
            />
          </div>

          <Tabs
            value={role || "all"}
            onValueChange={(v) => setRole(v === "all" ? "" : (v as RoleFilter))}
          >
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">Todos</TabsTrigger>
              <TabsTrigger value="participant" data-testid="tab-participant">Participantes</TabsTrigger>
              <TabsTrigger value="administrator" data-testid="tab-administrator">Admins</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        ) : allUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <Users className="h-14 w-14 opacity-20" />
            <p className="text-base font-light">No se encontraron miembros</p>
            {(debouncedSearch || role) && (
              <button
                className="text-[11px] uppercase tracking-widest text-primary hover:text-primary/70 transition-colors"
                onClick={() => { setSearch(""); setRole(""); }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allUsers.map((user: any) => (
                <MemberCard key={user.id} user={user} />
              ))}
            </div>

            <div ref={sentinelRef} className="flex justify-center py-6">
              {isFetchingNextPage && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              {!hasNextPage && allUsers.length > 0 && !isFetching && (
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {allUsers.length} miembro{allUsers.length !== 1 ? "s" : ""} en total
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function MemberCard({ user }: { user: any }) {
  const profileHref = user.username ? `/miembros/${user.username}` : "#";
  const cardHref = user.username ? `/m/${user.username}` : null;
  const shortBio = user.bio ? user.bio.slice(0, 80) + (user.bio.length > 80 ? "…" : "") : null;
  const isAdmin = user.role === "administrator";

  return (
    <div
      className={`group bg-white/5 hover:bg-white/8 transition-all ${user.username ? "" : "opacity-70"}`}
      data-testid={`card-member-${user.id}`}
    >
      <Link href={profileHref}>
        <div className="p-5 flex flex-col items-center text-center gap-3 cursor-pointer">
          <div className="relative">
            <Avatar className="h-14 w-14 mt-1 ring-2 ring-transparent group-hover:ring-primary transition-all duration-200">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="text-lg bg-primary/20 text-primary">
                {user.displayName?.charAt(0)?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="w-full min-w-0">
            <p className="font-light text-lg text-foreground truncate leading-tight">
              {user.displayName}
            </p>
            {user.username && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                @{user.username}
              </p>
            )}
          </div>

          <span className={`text-[10px] px-2 py-0.5 rounded-none font-medium uppercase tracking-widest ${
            isAdmin
              ? "bg-primary/20 text-primary"
              : "bg-muted/60 text-muted-foreground"
          }`}>
            {isAdmin ? "Admin" : "Miembro"}
          </span>

          {shortBio && (
            <p className="text-xs text-white/50 leading-relaxed line-clamp-2 w-full">
              {shortBio}
            </p>
          )}
        </div>
      </Link>
      {cardHref && (
        <div className="px-5 pb-4 pt-0 -mt-1">
          <Link href={cardHref}>
            <button className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary border-t border-border/30 transition-colors">
              Ver tarjeta
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
