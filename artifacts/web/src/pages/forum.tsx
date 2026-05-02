import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListForumCategories, useListForumPosts, useCreateForumPost, getListForumPostsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Pin, Lock, Plus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";

export default function ForumPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const qc = useQueryClient();

  const { data: categories } = useListForumCategories();
  const { data: postsData, isLoading } = useListForumPosts(
    { categoryId: selectedCategory || undefined, search: search || undefined, limit: 20 },
    { query: { queryKey: getListForumPostsQueryKey({ categoryId: selectedCategory || undefined, search: search || undefined, limit: 20 }) } }
  );
  const createPost = useCreateForumPost();

  const form = useForm<{ title: string; body: string; categoryId: string }>({ defaultValues: { title: "", body: "", categoryId: "" } });

  const onSubmit = (data: { title: string; body: string; categoryId: string }) => {
    createPost.mutate({ data }, {
      onSuccess: () => {
        form.reset();
        setCreateOpen(false);
        qc.invalidateQueries({ queryKey: getListForumPostsQueryKey({}) });
      },
    });
  };

  const cats = (categories as any[]) ?? [];
  const posts = (postsData as any)?.posts ?? [];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6 text-primary" />Forum</h1>
            <p className="text-muted-foreground text-sm mt-1">Join the discussion. Share knowledge, ask questions, explore ideas.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1" data-testid="button-new-post"><Plus className="h-4 w-4" />New Post</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Post</DialogTitle></DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Select onValueChange={(v) => form.setValue("categoryId", v)}>
                  <SelectTrigger data-testid="select-category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {cats.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Post title" {...form.register("title")} data-testid="input-post-title" />
                <Textarea placeholder="What's on your mind?" rows={6} {...form.register("body")} data-testid="input-post-body" />
                <Button type="submit" disabled={createPost.isPending} className="w-full" data-testid="button-submit-post">
                  {createPost.isPending ? "Posting..." : "Post"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-56 shrink-0">
            <Card>
              <CardContent className="p-3 space-y-1">
                <button
                  onClick={() => setSelectedCategory("")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCategory ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                  data-testid="btn-all-categories"
                >
                  All Categories
                </button>
                {cats.map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${selectedCategory === cat.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                    data-testid={`btn-category-${cat.id}`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-xs opacity-60">{cat.postCount}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>

          {/* Post list */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search posts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-forum-search" />
            </div>

            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : posts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No posts yet. Start the conversation!</p>
              </div>
            ) : (
              posts.map((post: any) => (
                <Link href={`/forum/${post.id}`} key={post.id}>
                  <Card className="hover:border-primary/40 transition-colors cursor-pointer" data-testid={`card-post-${post.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={post.authorAvatar} />
                          <AvatarFallback className="text-xs">{post.authorName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {post.isPinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                            {post.isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                            <h3 className="font-semibold text-sm text-foreground truncate">{post.title}</h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span>{post.authorName}</span>
                            {post.categoryName && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{post.categoryName}</Badge>}
                            <span>{post.replyCount} replies</span>
                            <span>{formatDistanceToNow(new Date(post.lastActivityAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
