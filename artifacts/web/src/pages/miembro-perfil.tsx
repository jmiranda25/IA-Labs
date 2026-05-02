import { Layout } from "@/components/layout";
import { useGetUserByUsername } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  MapPin,
  Globe,
  Calendar,
  Shield,
  ArrowLeft,
  UserCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function MiembroPerfilPage({ username }: { username: string }) {
  const { data: user, isLoading, isError } = useGetUserByUsername(username);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (isError || !user) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-6 flex flex-col items-center gap-4 py-24 text-muted-foreground">
          <UserCircle className="h-16 w-16 opacity-20" />
          <p className="text-lg font-medium">Usuario no encontrado</p>
          <p className="text-sm">No existe ningún miembro con el usuario @{username}</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/miembros">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al directorio
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const u = user as any;
  const isAdmin = u.role === "administrator";

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Back link */}
        <Link href="/miembros">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" />
            Directorio
          </span>
        </Link>

        {/* Profile card */}
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-24 w-24 shrink-0 rounded-xl">
                <AvatarImage src={u.avatarUrl} className="object-cover" />
                <AvatarFallback className="text-3xl bg-primary/20 text-primary rounded-xl">
                  {u.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mb-1">
                  <h1
                    className="text-2xl font-bold text-foreground"
                    data-testid="text-member-name"
                  >
                    {u.displayName}
                  </h1>
                  {isAdmin && (
                    <Badge variant="default" className="gap-1">
                      <Shield className="h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                </div>

                {u.username && (
                  <p className="text-muted-foreground text-sm mb-3">
                    @{u.username}
                  </p>
                )}

                {u.bio && (
                  <p
                    className="text-muted-foreground text-sm mb-4 leading-relaxed"
                    data-testid="text-member-bio"
                  >
                    {u.bio}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground justify-center sm:justify-start">
                  {u.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {u.location}
                    </span>
                  )}
                  {u.website && (
                    <a
                      href={u.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      {u.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    Se unió{" "}
                    {formatDistanceToNow(new Date(u.joinedAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Skills */}
            {(u.skills as string[])?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Habilidades
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(u.skills as string[]).map((skill: string) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      data-testid={`badge-skill-${skill}`}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role info card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
              Rol en la comunidad
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <>
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Administrador</span>
                </>
              ) : (
                <>
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Participante</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
