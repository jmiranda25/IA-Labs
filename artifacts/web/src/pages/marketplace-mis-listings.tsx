import { useState, useRef } from "react";
import { Layout } from "@/components/layout";
import {
  useGetMyListings,
  useCreateMarketplaceListing,
  useUpdateMarketplaceListing,
  useMarkListingAsSold,
  useUploadListingImages,
  getGetMyListingsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ShoppingBag, Plus, Edit, CheckCircle, Image as ImageIcon,
  Clock, XCircle, Tag,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";

const CATEGORIES = [
  "Herramientas IA", "Consultoría", "Desarrollo", "Datasets",
  "Cursos", "Diseño", "Marketing", "Automatización", "Otro",
];

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

const TABS: { value: string; label: string }[] = [
  { value: "all",      label: "Todos" },
  { value: "draft",    label: "Borradores" },
  { value: "pending",  label: "En revisión" },
  { value: "active",   label: "Activos" },
  { value: "sold",     label: "Vendidos" },
  { value: "rejected", label: "Rechazados" },
];

const listingSchema = z.object({
  title: z.string().min(3, "Mínimo 3 caracteres"),
  description: z.string().min(10, "Mínimo 10 caracteres"),
  category: z.string().min(1, "Selecciona una categoría"),
  price: z.string().optional(),
  currency: z.string().default("PEN"),
});
type ListingForm = z.infer<typeof listingSchema>;

function ListingRow({ listing, onEdit }: { listing: any; onEdit: (l: any) => void }) {
  const qc = useQueryClient();
  const markSold = useMarkListingAsSold();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImages = useUploadListingImages();

  const handleMarkSold = async () => {
    try {
      await markSold.mutateAsync({ slug: listing.slug });
      qc.invalidateQueries({ queryKey: getGetMyListingsQueryKey() });
      toast.success("Marcado como vendido");
    } catch { toast.error("Error al actualizar"); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    try {
      await uploadImages.mutateAsync({ slug: listing.slug, data: formData as any });
      qc.invalidateQueries({ queryKey: getGetMyListingsQueryKey() });
      toast.success(`${files.length} imagen(es) subida(s)`);
    } catch { toast.error("Error al subir imágenes"); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const firstImage = listing.images?.[0]?.url;
  const sb = STATUS_CLASS[listing.status];
  const sl = STATUS_LABEL[listing.status];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="w-24 h-24 shrink-0 bg-muted flex items-center justify-center overflow-hidden">
            {firstImage
              ? <img src={firstImage} alt={listing.title} className="w-full h-full object-cover" />
              : <ShoppingBag className="h-8 w-8 text-muted-foreground/20" />}
          </div>
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <Link href={`/marketplace/${listing.slug}`}>
                <h3 className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1">
                  {listing.title}
                </h3>
              </Link>
              <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 ${sb}`}>{sl}</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                <Tag className="h-2.5 w-2.5" />{listing.category}
              </Badge>
              {listing.price != null && (
                <span className="font-medium text-primary">S/ {Number(listing.price).toLocaleString("es")}</span>
              )}
              <span>·</span>
              <span>{formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true, locale: es })}</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Button
                size="sm" variant="ghost"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => onEdit(listing)}
              >
                <Edit className="h-3 w-3" />Editar
              </Button>
              <Button
                size="sm" variant="ghost"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadImages.isPending || listing.images?.length >= 6}
              >
                <ImageIcon className="h-3 w-3" />
                {listing.images?.length >= 6 ? "Máx 6" : "Fotos"}
              </Button>
              {listing.status === "active" && (
                <Button
                  size="sm" variant="ghost"
                  className="h-7 px-2 text-xs gap-1 text-blue-400"
                  disabled={markSold.isPending}
                  onClick={handleMarkSold}
                >
                  <CheckCircle className="h-3 w-3" />Vendido
                </Button>
              )}
            </div>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
      </CardContent>
    </Card>
  );
}

export default function MisAnunciosPage() {
  const qc = useQueryClient();
  const { data: rawListings, isLoading } = useGetMyListings({
    query: { queryKey: getGetMyListingsQueryKey() },
  });
  const allListings = (rawListings as any[]) ?? [];

  const create = useCreateMarketplaceListing();
  const update = useUpdateMarketplaceListing();

  const [createOpen, setCreateOpen] = useState(false);
  const [editListing, setEditListing] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all");

  const form = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: { title: "", description: "", category: "", price: "", currency: "PEN" },
  });

  const editForm = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: { title: "", description: "", category: "", price: "", currency: "PEN" },
  });

  const openEdit = (listing: any) => {
    setEditListing(listing);
    editForm.reset({
      title: listing.title,
      description: listing.description,
      category: listing.category,
      price: listing.price != null ? String(listing.price) : "",
      currency: listing.currency ?? "PEN",
    });
  };

  const onCreateSubmit = async (values: ListingForm) => {
    try {
      await create.mutateAsync({
        data: {
          title: values.title,
          description: values.description,
          category: values.category,
          price: values.price ? parseFloat(values.price) : undefined,
          currency: values.currency,
        },
      });
      qc.invalidateQueries({ queryKey: getGetMyListingsQueryKey() });
      toast.success("Anuncio enviado a revisión");
      form.reset();
      setCreateOpen(false);
    } catch { toast.error("Error al crear"); }
  };

  const onEditSubmit = async (values: ListingForm) => {
    if (!editListing) return;
    try {
      await update.mutateAsync({
        slug: editListing.slug,
        data: {
          title: values.title,
          description: values.description,
          category: values.category,
          price: values.price ? parseFloat(values.price) : undefined,
          currency: values.currency,
        },
      });
      qc.invalidateQueries({ queryKey: getGetMyListingsQueryKey() });
      toast.success("Anuncio actualizado");
      setEditListing(null);
    } catch { toast.error("Error al actualizar"); }
  };

  const filtered = activeTab === "all"
    ? allListings
    : allListings.filter((l: any) => l.status === activeTab);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-primary" />Mis anuncios
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gestiona tus publicaciones en el marketplace.
            </p>
          </div>
          <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />Nuevo anuncio
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1 mb-4">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs">
                {t.label}
                {t.value !== "all" && (
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    ({allListings.filter((l: any) => t.value === "all" || l.status === t.value).length})
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No hay anuncios en esta categoría.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((l: any) => (
                    <ListingRow key={l.id} listing={l} onEdit={openEdit} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Create dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nuevo anuncio</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input placeholder="Título del anuncio" {...form.register("title")} />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Categoría *</Label>
                <Select onValueChange={(v) => form.setValue("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>Precio (opcional)</Label>
                  <Input type="number" placeholder="0.00" min="0" {...form.register("price")} />
                </div>
                <div className="w-24 space-y-1.5">
                  <Label>Moneda</Label>
                  <Select onValueChange={(v) => form.setValue("currency", v)} defaultValue="PEN">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PEN">S/ PEN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descripción * (Markdown)</Label>
                <Textarea
                  placeholder="Describe tu servicio o producto..."
                  rows={5}
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Será revisado antes de publicarse.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Enviando..." : "Enviar a revisión"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={!!editListing} onOpenChange={(o) => !o && setEditListing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Editar anuncio</DialogTitle></DialogHeader>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input placeholder="Título del anuncio" {...editForm.register("title")} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoría *</Label>
                <Select
                  value={editForm.watch("category")}
                  onValueChange={(v) => editForm.setValue("category", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>Precio (opcional)</Label>
                  <Input type="number" placeholder="0.00" min="0" {...editForm.register("price")} />
                </div>
                <div className="w-24 space-y-1.5">
                  <Label>Moneda</Label>
                  <Select
                    value={editForm.watch("currency")}
                    onValueChange={(v) => editForm.setValue("currency", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PEN">S/ PEN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descripción * (Markdown)</Label>
                <Textarea rows={5} {...editForm.register("description")} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditListing(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? "Guardando..." : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
