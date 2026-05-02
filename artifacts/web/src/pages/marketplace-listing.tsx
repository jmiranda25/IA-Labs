import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useGetMarketplaceListing,
  useMarkListingAsSold,
  useSendListingMessage,
  useGetMe,
  getGetMarketplaceListingQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import {
  ShoppingBag, Tag, DollarSign, MessageCircle,
  CheckCircle, Edit, ExternalLink, ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador", pending: "En revisión",
  active: "Activo", sold: "Vendido", rejected: "Rechazado",
};
const STATUS_CLASS: Record<string, string> = {
  pending:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  draft:    "bg-muted text-muted-foreground border-border",
  active:   "bg-green-500/10 text-green-400 border-green-500/20",
  sold:     "bg-blue-500/10 text-blue-400 border-blue-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function MarketplaceListingPage({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: listing, isLoading } = useGetMarketplaceListing(slug, {
    query: { queryKey: getGetMarketplaceListingQueryKey(slug) },
  });
  const { data: me } = useGetMe();
  const markSold = useMarkListingAsSold();

  const l = listing as any;
  const isSeller = me?.id === l?.sellerId;

  const handleMarkSold = async () => {
    try {
      await markSold.mutateAsync({ slug });
      qc.invalidateQueries({ queryKey: getGetMarketplaceListingQueryKey(slug) });
      toast.success("Anuncio marcado como vendido");
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleContact = () => {
    if (!l) return;
    setLocation(`/mensajes/${l.id}/${l.sellerId}`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </Layout>
    );
  }
  if (!l) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto p-6 text-center text-muted-foreground py-20">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Anuncio no encontrado.</p>
        </div>
      </Layout>
    );
  }

  const images: any[] = l.images ?? [];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Link href="/marketplace">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2">
            <ChevronLeft className="h-4 w-4" />Volver al marketplace
          </Button>
        </Link>

        {/* Image carousel */}
        {images.length > 0 ? (
          <div className="relative rounded-xl overflow-hidden bg-muted">
            <Carousel>
              <CarouselContent>
                {images.map((img: any) => (
                  <CarouselItem key={img.id}>
                    <div className="h-72 w-full overflow-hidden">
                      <img src={img.url} alt={l.title} className="w-full h-full object-cover" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="left-3" />
                  <CarouselNext className="right-3" />
                </>
              )}
            </Carousel>
          </div>
        ) : (
          <div className="h-48 rounded-xl bg-muted flex items-center justify-center">
            <ShoppingBag className="h-14 w-14 text-muted-foreground/20" />
          </div>
        )}

        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Title + status */}
            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-2xl font-bold flex-1">{l.title}</h1>
              <Badge variant="outline" className={STATUS_CLASS[l.status] ?? ""}>
                {STATUS_LABEL[l.status] ?? l.status}
              </Badge>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {l.price != null ? (
                <span className="text-2xl font-bold text-primary">
                  {l.currency} {Number(l.price).toLocaleString("es")}
                </span>
              ) : (
                <span className="text-muted-foreground">Precio a convenir</span>
              )}
            </div>

            {/* Category */}
            <Badge variant="secondary" className="gap-1">
              <Tag className="h-3 w-3" />{l.category}
            </Badge>

            {/* Description */}
            <div className="prose prose-sm prose-invert max-w-none text-foreground/90 border-t border-border/40 pt-4">
              <ReactMarkdown>{l.description}</ReactMarkdown>
            </div>

            {/* Seller card */}
            <div className="border-t border-border/40 pt-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={l.sellerAvatar} />
                  <AvatarFallback>{l.sellerName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{l.sellerName}</p>
                  <p className="text-xs text-muted-foreground">
                    Publicado {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
              </div>
              {l.sellerUsername && (
                <Link href={`/miembros/${l.sellerUsername}`}>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                    <ExternalLink className="h-3.5 w-3.5" />Ver perfil
                  </Button>
                </Link>
              )}
            </div>

            {/* Actions */}
            {isSeller ? (
              <div className="flex gap-2 flex-wrap pt-1">
                <Link href={`/marketplace/mis-anuncios`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Edit className="h-3.5 w-3.5" />Editar
                  </Button>
                </Link>
                {l.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                    disabled={markSold.isPending}
                    onClick={handleMarkSold}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />Marcar vendido
                  </Button>
                )}
              </div>
            ) : (
              l.status === "active" && (
                <Button className="w-full gap-2 mt-1" onClick={handleContact}>
                  <MessageCircle className="h-4 w-4" />Contactar al vendedor
                </Button>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
