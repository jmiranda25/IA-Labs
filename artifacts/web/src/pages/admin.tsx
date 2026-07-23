import { useState, lazy, Suspense } from "react";
import { Layout } from "@/components/layout";
import { useGetMe, useGetAdminMetrics, getGetAdminMetricsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Redirect } from "wouter";
import {
  Shield, Users, BarChart3, Edit3, Calendar, BookOpen,
  ShoppingBag, Link2, GraduationCap, Eye, Flag,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useViewMode } from "@/contexts/view-mode";

const AdminDashboard = lazy(() => import("./admin/dashboard-tab"));
const UserManagement = lazy(() => import("./admin/user-management"));
const ModerationQueue = lazy(() => import("./admin/moderation-queue"));
const EventosAdmin = lazy(() => import("./admin/eventos-admin"));
const ResourcesAdmin = lazy(() => import("./admin/resources-admin"));
const MarketplaceAdmin = lazy(() => import("./admin/marketplace-admin"));
const PendingUsersTab = lazy(() => import("./admin/pending-users-tab"));
const ReferralLinksTab = lazy(() => import("./admin/referral-links-tab"));
const CoursesAdmin = lazy(() => import("./admin/courses-admin"));
const LandingEditor = lazy(() =>
  import("@/components/admin/landing-editor").then((m) => ({ default: m.LandingEditor }))
);

function TabFallback() {
  return <Skeleton className="h-64 w-full rounded-xl" />;
}

function PendingBadge() {
  const { data: metrics } = useGetAdminMetrics({ query: { queryKey: getGetAdminMetricsQueryKey() } });
  const count = (metrics as any)?.pendingUsers ?? 0;
  if (!count) return null;
  return (
    <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-purple-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Admin Page ────────────────────────────────────────────────────────────────

const VALID_TABS = new Set([
  "dashboard", "pendientes", "users", "moderacion", "landing",
  "eventos", "recursos", "marketplace", "referidos", "cursos",
]);

export default function AdminPage() {
  const { data: me, isLoading } = useGetMe();
  const search = useSearch();
  const initialTab = (() => {
    const tab = new URLSearchParams(search).get("tab");
    return tab && VALID_TABS.has(tab) ? tab : "dashboard";
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const { viewAsUser, toggleViewMode } = useViewMode();
  const [, navigate] = useLocation();

  if (isLoading) return <Layout><Skeleton className="m-6 h-64 rounded-xl" /></Layout>;
  if ((me as any)?.role !== "administrator") return <Redirect to="/dashboard" />;

  const handleToggleUserView = () => {
    toggleViewMode();
    if (!viewAsUser) {
      navigate("/dashboard");
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />Centro de Control
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gestión de la comunidad, usuarios y moderación.</p>
          </div>
          <Button
            variant={viewAsUser ? "default" : "outline"}
            size="sm"
            onClick={handleToggleUserView}
            className={viewAsUser ? "bg-amber-500 hover:bg-amber-600 text-black border-0" : ""}
          >
            <Eye className="h-4 w-4 mr-1.5" />
            {viewAsUser ? "Salir del modo usuario" : "Ver como usuario"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" data-testid="tab-admin-dashboard"><BarChart3 className="h-4 w-4 mr-1.5" />Dashboard</TabsTrigger>
            <TabsTrigger value="pendientes" data-testid="tab-admin-pendientes" className="gap-1.5">
              <Users className="h-4 w-4" />
              Pendientes
              <PendingBadge />
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-admin-users"><Users className="h-4 w-4 mr-1.5" />Usuarios</TabsTrigger>
            <TabsTrigger value="moderacion" data-testid="tab-admin-moderation"><Flag className="h-4 w-4 mr-1.5" />Moderación</TabsTrigger>
            <TabsTrigger value="landing" data-testid="tab-admin-landing"><Edit3 className="h-4 w-4 mr-1.5" />Landing</TabsTrigger>
            <TabsTrigger value="eventos" data-testid="tab-admin-eventos"><Calendar className="h-4 w-4 mr-1.5" />Eventos</TabsTrigger>
            <TabsTrigger value="recursos" data-testid="tab-admin-recursos"><BookOpen className="h-4 w-4 mr-1.5" />Recursos</TabsTrigger>
            <TabsTrigger value="marketplace" data-testid="tab-admin-marketplace"><ShoppingBag className="h-4 w-4 mr-1.5" />Marketplace</TabsTrigger>
            <TabsTrigger value="referidos" data-testid="tab-admin-referidos"><Link2 className="h-4 w-4 mr-1.5" />Referidos</TabsTrigger>
            <TabsTrigger value="cursos" data-testid="tab-admin-cursos"><GraduationCap className="h-4 w-4 mr-1.5" />Cursos</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <AdminDashboard onDrillDown={setActiveTab} />
            </Suspense>
          </TabsContent>
          <TabsContent value="pendientes" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <PendingUsersTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <UserManagement />
            </Suspense>
          </TabsContent>
          <TabsContent value="moderacion" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <ModerationQueue />
            </Suspense>
          </TabsContent>
          <TabsContent value="landing" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <LandingEditor />
            </Suspense>
          </TabsContent>
          <TabsContent value="eventos" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <EventosAdmin />
            </Suspense>
          </TabsContent>
          <TabsContent value="recursos" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <ResourcesAdmin />
            </Suspense>
          </TabsContent>
          <TabsContent value="marketplace" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <MarketplaceAdmin />
            </Suspense>
          </TabsContent>
          <TabsContent value="referidos" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <ReferralLinksTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="cursos" className="mt-6">
            <Suspense fallback={<TabFallback />}>
              <CoursesAdmin />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
