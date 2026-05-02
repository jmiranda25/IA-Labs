import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListResources, useListResourceCategories, useCreateResource, useRequestUploadUrl, getListResourcesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Download, Plus, Search, File, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";

const CATEGORIES = ["Paper", "Dataset", "Tutorial", "Tool", "Video", "Other"];

function ResourceCard({ r }: { r: any }) {
  return (
    <a href={r.fileUrl} target="_blank" rel="noopener noreferrer">
      <Card className="hover:border-primary/40 transition-all hover:-translate-y-0.5 cursor-pointer h-full" data-testid={`card-resource-${r.id}`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <File className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">{r.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{r.category}</Badge>
                <span className="text-xs text-muted-foreground">{r.authorName}</span>
              </div>
            </div>
          </div>
          {r.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{r.description}</p>}
          {(r.tags as string[])?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {(r.tags as string[]).map((t: string) => (
                <span key={t} className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Tag className="h-2.5 w-2.5" />{t}</span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Download className="h-3 w-3" />{r.downloadCount} downloads</span>
            <span>{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

export default function ResourcesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useListResources(
    { search: search || undefined, category: category || undefined, limit: 20 },
    { query: { queryKey: getListResourcesQueryKey({ search: search || undefined, category: category || undefined, limit: 20 }) } }
  );
  const { data: cats } = useListResourceCategories();
  const createResource = useCreateResource();
  const requestUrl = useRequestUploadUrl();

  const form = useForm<{ title: string; description: string; category: string; tags: string }>({
    defaultValues: { title: "", description: "", category: CATEGORIES[0], tags: "" },
  });

  const onSubmit = async (fields: any) => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const urlData = await requestUrl.mutateAsync({ data: { objectPath: `resources/${Date.now()}_${uploadFile.name}`, contentType: uploadFile.type } });
      await fetch((urlData as any).uploadURL, { method: "PUT", body: uploadFile, headers: { "Content-Type": uploadFile.type } });
      const fileUrl = (urlData as any).objectPath;
      const tags = fields.tags ? fields.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
      await createResource.mutateAsync({ data: { title: fields.title, description: fields.description, fileUrl, fileType: uploadFile.type, fileSize: uploadFile.size, category: fields.category, tags } });
      qc.invalidateQueries({ queryKey: getListResourcesQueryKey({}) });
      form.reset();
      setUploadFile(null);
      setUploadOpen(false);
    } finally {
      setUploading(false);
    }
  };

  const resources = (data as any)?.resources ?? [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" />Resources</h1>
            <p className="text-muted-foreground text-sm mt-1">Papers, datasets, tools, and tutorials curated by the community.</p>
          </div>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1" data-testid="button-upload-resource"><Plus className="h-4 w-4" />Upload</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Resource</DialogTitle></DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  data-testid="input-resource-file"
                />
                <Input placeholder="Title" {...form.register("title")} data-testid="input-resource-title" />
                <Textarea placeholder="Description (optional)" rows={3} {...form.register("description")} />
                <Select onValueChange={(v) => form.setValue("category", v)} defaultValue={CATEGORIES[0]}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Tags (comma separated)" {...form.register("tags")} />
                <Button type="submit" disabled={uploading || !uploadFile} className="w-full" data-testid="button-submit-resource">
                  {uploading ? "Uploading..." : "Upload Resource"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-resource-search" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40" data-testid="select-resource-category"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {[...CATEGORIES, ...((cats as string[]) ?? [])].filter((v, i, a) => a.indexOf(v) === i).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No resources yet. Upload the first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((r: any) => <ResourceCard key={r.id} r={r} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
