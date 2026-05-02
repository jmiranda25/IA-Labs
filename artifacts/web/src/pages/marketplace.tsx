import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListMarketplaceListings,
  getListMarketplaceListingsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { ShoppingBag, Search, Plus, Tag, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useDebounce } from "@/hooks/use-debounce";

const CATEGORIES = [
  "Herramientas IA", "Consultoría", "Desarrollo", "Datasets",
  "Cursos", "Diseño", "Marketing", "Automatización", "Otro",
];

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  pending:  { label: "En revisión", class: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  draft:    { label: "Borrador",    class: "bg-muted text-muted-foreground border-border" },
  active:   { label: "Activo",      class: "bg-green-500/10 text-green-400 border-green-500/20" },
  sold:     { label: "Vendido",     class: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  rejected: { label: "Rechazado",   class: "bg-destructive/10 text-destructive border-destructive/20" },
};

function ListingCard({ listing }: { listing: any }) {
  const firstImage = listing.images?.[0]?.url;
  const sb = STATUS_BADGE[listing.status];
  return (
    <Link href={`/marketplace/${listing.slug}`}>
      <Card className="hover:border-primary/40 transition-all hover:-translate-y-0.5 cursor-pointer h-full overflow-hidden">
        <div className={`h-36 bg-muted flex items-center justify-center overflow-hidden ${firstImage ? "" : "opacity-60"}`}>
          {firstImage
            ? <img src={firstImage} alt={listing.title} className="w-full h-full object-cover" />
            : <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm line-clamp-2 flex-1">{listing.title}</h3>
            {sb && (
              <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 ${sb.class}`}>
                {sb.label}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={listing.sellerAvatar} />
                <AvatarFallback className="text-[9px]">{listing.sellerName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-24">{listing.sellerName}</span>
            </div>
            {listing.price != null ? (
              <span className="text-sm font-semibold text-primary">
                {listing.currency} {Number(listing.price).toLocaleString("es")}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground italic">Precio a convenir</span>
            )}
          </div>
          <div className="mt-2">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              <Tag className="h-2.5 w-2.5 mr-1" />{listing.category}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  const params = {
    q: debouncedSearch || undefined,
    category: category || undefined,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    limit: 24,
  };

  const { data, isLoading } = useListMarketplaceListings(params, {
    query: { queryKey: getListMarketplaceListingsQueryKey(params) },
  });

  const listings = (data as any)?.listings ?? [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-primary" />Marketplace
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Servicios, herramientas y oportunidades de IA.
            </p>
          </div>
          <Link href="/marketplace/mis-anuncios">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />Mis anuncios
            </Button>
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar filters */}
          <aside className="lg:w-56 shrink-0 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</p>
              <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />Precio
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="text-sm"
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="Máx"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="text-sm"
                  min={0}
                />
              </div>
            </div>

            {(search || category || minPrice || maxPrice) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => { setSearch(""); setCategory(""); setMinPrice(""); setMaxPrice(""); }}
              >
                Limpiar filtros
              </Button>
            )}
          </aside>

          {/* Listing grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">No hay anuncios</p>
                <p className="text-sm mt-1">Sé el primero en publicar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {listings.map((l: any) => <ListingCard key={l.id} listing={l} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
