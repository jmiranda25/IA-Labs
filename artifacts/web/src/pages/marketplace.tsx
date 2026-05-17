import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout";
import {
  useListMarketplaceListings,
  getListMarketplaceListingsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <div className="relative overflow-hidden cursor-pointer h-64 sm:h-72 transition-transform hover:-translate-y-0.5">
        {/* Full-bleed background */}
        {firstImage ? (
          <img
            src={firstImage}
            alt={listing.title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-primary/30" />
          </div>
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Top-right badges: status + price */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {sb && listing.status !== "active" && (
            <span className={`inline-block rounded-none px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${sb.class}`}>
              {sb.label}
            </span>
          )}
          {listing.price != null ? (
            <span className="inline-block rounded-none bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-secondary-foreground">
              S/ {Number(listing.price).toLocaleString("es")}
            </span>
          ) : (
            <span className="inline-block rounded-none bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-secondary-foreground">
              A convenir
            </span>
          )}
        </div>

        {/* Content — bottom left */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-2xl font-light text-white leading-snug line-clamp-2 mb-2">
            {listing.title}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={listing.sellerAvatar} />
                <AvatarFallback className="text-[8px]">{listing.sellerName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="truncate max-w-28">{listing.sellerName}</span>
            </span>
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3 shrink-0" />
              {listing.category}
            </span>
          </div>
        </div>
      </div>
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
      <Helmet>
        <title>Marketplace de IA — AI Community</title>
        <meta name="description" content="Servicios, herramientas y oportunidades de inteligencia artificial. Compra, vende y conecta con la comunidad." />
        <meta property="og:title" content="Marketplace de IA — AI Community" />
        <meta property="og:description" content="Servicios, herramientas y oportunidades de IA en la comunidad hispanohablante." />
      </Helmet>
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
