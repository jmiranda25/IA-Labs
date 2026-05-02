import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetMe, useGetAdminStats, useAdminListUsers, useAdminUpdateUserRole, useAdminBanUser, useGetModerationQueue, useResolveModerationItem, useGetLandingContent, useUpdateLandingSection, getGetAdminStatsQueryKey, getAdminListUsersQueryKey, getGetModerationQueueQueryKey, getGetLandingContentQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Users, AlertTriangle, BarChart3, Edit3, Check, X } from "lucide-react";

function AdminStats() {
  const { data: stats } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });
  if (!stats) return <Skeleton className="h-40 rounded-xl" />;
  const s = stats as any;
  const items = [
    { label: "Total Members", value: s.totalUsers },
    { label: "New This Week", value: s.newUsersThisWeek },
    { label: "Total Events", value: s.totalEvents },
    { label: "Forum Posts", value: s.totalForumPosts },
    { label: "Resources", value: s.totalResources },
    { label: "Listings", value: s.totalListings },
    { label: "Pending Mod", value: s.pendingModerationItems, highlight: s.pendingModerationItems > 0 },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map(({ label, value, highlight }) => (
        <Card key={label} className={highlight ? "border-destructive/40" : ""}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${highlight ? "text-destructive" : ""}`} data-testid={`admin-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UserManagement() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { data } = useAdminListUsers({ search: search || undefined, limit: 50 }, { query: { queryKey: getAdminListUsersQueryKey({ search: search || undefined, limit: 50 }) } });
  const updateRole = useAdminUpdateUserRole();
  const banUser = useAdminBanUser();
  const users = (data as any)?.users ?? [];

  return (
    <div className="space-y-4">
      <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-admin-user-search" />
      <div className="space-y-2">
        {users.map((u: any) => (
          <Card key={u.id} data-testid={`admin-user-${u.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={u.avatarUrl} />
                  <AvatarFallback className="text-xs">{u.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{u.displayName}</p>
                    <Badge variant={u.role === "administrator" ? "default" : "secondary"} className="text-[10px]">{u.role}</Badge>
                    {u.isBanned && <Badge variant="destructive" className="text-[10px]">Banned</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{u.clerkId}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={u.role}
                    onValueChange={(role) => updateRole.mutate({ userId: u.clerkId, data: { role: role as "participant" | "administrator" } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) }) })}
                  >
                    <SelectTrigger className="h-7 text-xs w-32" data-testid={`select-role-${u.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="participant">Participant</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  {!u.isBanned && (
                    <Button size="sm" variant="destructive" className="h-7 text-xs"
                      onClick={() => banUser.mutate({ userId: u.clerkId }, { onSuccess: () => qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey({}) }) })}
                      data-testid={`button-ban-${u.id}`}
                    >
                      Ban
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ModerationQueue() {
  const qc = useQueryClient();
  const { data } = useGetModerationQueue({ query: { queryKey: getGetModerationQueueQueryKey() } });
  const resolve = useResolveModerationItem();
  const items = (data as any[]) ?? [];

  const handleResolve = (itemId: string, action: string) => {
    resolve.mutate({ itemId, data: { action: action as "remove" | "keep" } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetModerationQueueQueryKey() }) });
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Check className="h-10 w-10 mx-auto mb-3 text-green-400 opacity-50" />
          <p>No items pending moderation</p>
        </div>
      ) : items.map((item: any) => (
        <Card key={item.id} className="border-yellow-500/20" data-testid={`mod-item-${item.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-semibold capitalize">{item.contentType} reported</span>
                  <Badge variant="secondary" className="text-[10px]">{item.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Reason: {item.reason}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Content ID: {item.contentId}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => handleResolve(item.id, "keep")} data-testid={`button-keep-${item.id}`}>
                  <Check className="h-3 w-3" />Keep
                </Button>
                <Button size="sm" variant="destructive" className="h-7 gap-1" onClick={() => handleResolve(item.id, "remove")} data-testid={`button-remove-${item.id}`}>
                  <X className="h-3 w-3" />Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LandingEditor() {
  const qc = useQueryClient();
  const { data: sections } = useGetLandingContent({ query: { queryKey: getGetLandingContentQueryKey() } });
  const updateSection = useUpdateLandingSection();
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const hero = (sections as any[])?.find((s: any) => s.section === "hero")?.content ?? {};

  const save = async () => {
    setSaving(true);
    await updateSection.mutateAsync({ section: "hero", data: { content: { ...hero, ...edits } } });
    qc.invalidateQueries({ queryKey: getGetLandingContentQueryKey() });
    setEdits({});
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Edit3 className="h-4 w-4 text-primary" />Landing Page Content</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Headline</p>
          <Input
            defaultValue={hero.headline ?? ""}
            onChange={(e) => setEdits((p) => ({ ...p, headline: e.target.value }))}
            data-testid="input-landing-headline"
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Subtitle</p>
          <Input
            defaultValue={hero.subtitle ?? ""}
            onChange={(e) => setEdits((p) => ({ ...p, subtitle: e.target.value }))}
            data-testid="input-landing-subtitle"
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">CTA Button Text</p>
          <Input
            defaultValue={hero.cta ?? ""}
            onChange={(e) => setEdits((p) => ({ ...p, cta: e.target.value }))}
            data-testid="input-landing-cta"
          />
        </div>
        <Button onClick={save} disabled={saving || Object.keys(edits).length === 0} data-testid="button-save-landing">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { data: me, isLoading } = useGetMe();
  if (isLoading) return <Layout><Skeleton className="m-6 h-64 rounded-xl" /></Layout>;
  if ((me as any)?.role !== "administrator") return <Redirect to="/dashboard" />;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />Admin Panel</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage community, users, and moderation.</p>
        </div>

        <Tabs defaultValue="stats">
          <TabsList>
            <TabsTrigger value="stats" data-testid="tab-admin-stats"><BarChart3 className="h-4 w-4 mr-1.5" />Stats</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-admin-users"><Users className="h-4 w-4 mr-1.5" />Users</TabsTrigger>
            <TabsTrigger value="moderation" data-testid="tab-admin-moderation"><AlertTriangle className="h-4 w-4 mr-1.5" />Moderation</TabsTrigger>
            <TabsTrigger value="landing" data-testid="tab-admin-landing"><Edit3 className="h-4 w-4 mr-1.5" />Landing</TabsTrigger>
          </TabsList>
          <TabsContent value="stats" className="mt-6"><AdminStats /></TabsContent>
          <TabsContent value="users" className="mt-6"><UserManagement /></TabsContent>
          <TabsContent value="moderation" className="mt-6"><ModerationQueue /></TabsContent>
          <TabsContent value="landing" className="mt-6"><LandingEditor /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
