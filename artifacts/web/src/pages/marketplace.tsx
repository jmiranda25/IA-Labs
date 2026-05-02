import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListMarketplaceListings, useCreateMarketplaceListing, getListMarketplaceListingsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Plus, Search, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";

function ListingCard({ listing }: { listing: any }) {
  return (
    <Link href={`/marketplace/${listing.id}`}>
      <Card className="hover:border-primary/40 transition-all hover:-translate-y-0.5 cursor-pointer h-full" data-testid={`card-listing-${listing.id}`}>
        {listing.imageUrl && (
          <div className="h-36 overflow-hidden rounded-t-xl">
            <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
          </div>
        )}
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-sm text-foreground line-clamp-2">{listing.title}</h3>
            <Badge variant={listing.type === "offering" ? "default" : "secondary"} className="shrink-0 text-xs">
              {listing.type === "offering" ? "Offering" : "Seeking"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>
          {(listing.tags as string[])?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {(listing.tags as string[]).slice(0, 3).map((t: string) => (
                <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={listing.authorAvatar} />
                <AvatarFallback className="text-[10px]">{listing.authorName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{listing.authorName}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageCircle className="h-3 w-3" />
              {listing.messageCount}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const qc = useQueryClient();

  type ListingType = "offering" | "seeking";
  type ListingStatus = "active" | "closed";
  const { data, isLoading } = useListMarketplaceListings(
    { search: search || undefined, type: (type || undefined) as ListingType | undefined, status: "active" as ListingStatus, limit: 20 },
    { query: { queryKey: getListMarketplaceListingsQueryKey({ search: search || undefined, type: (type || undefined) as ListingType | undefined, status: "active" as ListingStatus, limit: 20 }) } }
  );
  const createListing = useCreateMarketplaceListing();

  const form = useForm<{ title: string; description: string; type: string; tags: string }>({
    defaultValues: { title: "", description: "", type: "offering", tags: "" },
  });

  const onSubmit = (fields: any) => {
    const tags = fields.tags ? fields.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
    createListing.mutate({ data: { ...fields, tags } }, {
      onSuccess: () => {
        form.reset();
        setCreateOpen(false);
        qc.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey({}) });
      },
    });
  };

  const listings = (data as any)?.listings ?? [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="h-6 w-6 text-primary" />Marketplace</h1>
            <p className="text-muted-foreground text-sm mt-1">Find collaborators, offer services, and explore AI opportunities.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1" data-testid="button-create-listing"><Plus className="h-4 w-4" />New Listing</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Listing</DialogTitle></DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Select onValueChange={(v) => form.setValue("type", v)} defaultValue="offering">
                  <SelectTrigger data-testid="select-listing-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offering">Offering a service</SelectItem>
                    <SelectItem value="seeking">Seeking a service</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Title" {...form.register("title")} data-testid="input-listing-title" />
                <Textarea placeholder="Description..." rows={4} {...form.register("description")} data-testid="input-listing-description" />
                <Input placeholder="Tags (comma separated)" {...form.register("tags")} />
                <Button type="submit" disabled={createListing.isPending} className="w-full" data-testid="button-submit-listing">
                  {createListing.isPending ? "Creating..." : "Create Listing"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search listings..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-listing-search" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-44" data-testid="select-listing-filter"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              <SelectItem value="offering">Offering</SelectItem>
              <SelectItem value="seeking">Seeking</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No listings yet. Create the first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l: any) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
