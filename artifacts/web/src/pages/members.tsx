import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Search, MapPin, Globe, Users } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export default function MembersPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useListUsers(
    debouncedSearch ? { search: debouncedSearch, limit: "24" } : { limit: "24" },
    { query: { queryKey: getListUsersQueryKey(debouncedSearch ? { search: debouncedSearch, limit: "24" } : { limit: "24" }) } }
  );

  const users = (data as any)?.users ?? [];
  const total = (data as any)?.total ?? 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Members
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{total} practitioners in the community</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, bio, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-member-search"
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map((user: any) => (
              <Link href={`/members/${user.clerkId}`} key={user.id}>
                <Card className="hover:border-primary/40 transition-all hover:-translate-y-0.5 cursor-pointer h-full" data-testid={`card-member-${user.id}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col items-center text-center">
                      <Avatar className="h-16 w-16 mb-3">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className="text-lg">{user.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-sm mb-1 text-foreground">{user.displayName}</h3>
                      {user.role === "administrator" && (
                        <Badge variant="default" className="text-xs mb-2">Admin</Badge>
                      )}
                      {user.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{user.bio}</p>
                      )}
                      {user.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{user.location}</span>
                        </div>
                      )}
                      {(user.skills as string[])?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 justify-center">
                          {(user.skills as string[]).slice(0, 3).map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                          ))}
                          {(user.skills as string[]).length > 3 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{(user.skills as string[]).length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
