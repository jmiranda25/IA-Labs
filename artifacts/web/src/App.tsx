import { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthLayout } from "@/components/auth-layout";
import { ProtectedRoute, RequireAdmin } from "@/components/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import { queryClient } from "@/lib/queryClient";
import { ViewModeProvider } from "@/contexts/view-mode";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";

const DashboardPage = lazy(() => import("@/pages/dashboard"));
const MembersPage = lazy(() => import("@/pages/members"));
const MemberProfilePage = lazy(() => import("@/pages/member-profile"));
const MiembrosPage = lazy(() => import("@/pages/miembros"));
const MiembroPerfilPage = lazy(() => import("@/pages/miembro-perfil"));
const EventsPage = lazy(() => import("@/pages/events"));
const EventosPage = lazy(() => import("@/pages/eventos"));
const EventoDetallePage = lazy(() => import("@/pages/evento-detalle"));
const ForumPage = lazy(() => import("@/pages/forum"));
const ForumPostPage = lazy(() => import("@/pages/forum-post"));
const ForoPage = lazy(() => import("@/pages/foro"));
const ForoCategoriaPage = lazy(() => import("@/pages/foro-categoria"));
const ForoHiloPage = lazy(() => import("@/pages/foro-hilo"));
const ResourcesPage = lazy(() => import("@/pages/resources"));
const RecursosPage = lazy(() => import("@/pages/recursos"));
const RecursoDetallePage = lazy(() => import("@/pages/recurso-detalle"));
const RecursoNuevoPage = lazy(() => import("@/pages/recurso-nuevo"));
const MarketplacePage = lazy(() => import("@/pages/marketplace"));
const MarketplaceListingPage = lazy(() => import("@/pages/marketplace-listing"));
const MisAnunciosPage = lazy(() => import("@/pages/marketplace-mis-listings"));
const MessagesPage = lazy(() => import("@/pages/messages"));
const MensajesThreadPage = lazy(() => import("@/pages/mensajes-thread"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const PerfilPage = lazy(() => import("@/pages/perfil"));
const AdminPage = lazy(() => import("@/pages/admin"));
const NotificacionesPage = lazy(() => import("@/pages/notificaciones"));
const PreferenciasNotificacionesPage = lazy(() => import("@/pages/preferencias-notificaciones"));
const ForbiddenPage = lazy(() => import("@/pages/forbidden"));
const CuentaPage = lazy(() => import("@/pages/cuenta"));
const TarjetaMiembroPage = lazy(() => import("@/pages/tarjeta-miembro"));
const PendientePage = lazy(() => import("@/pages/pendiente"));
const RechazadoPage = lazy(() => import("@/pages/rechazado"));
const CursosPage = lazy(() => import("@/pages/cursos"));
const CursoDetallePage = lazy(() => import("@/pages/curso-detalle"));

const basePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

function PageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        role="status"
        aria-label="Cargando..."
      />
    </div>
  );
}

// ── Auth pages ────────────────────────────────────────────────────────────────

function SignInPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pre = params.get("email");
    if (pre) setEmail(pre);
  }, []);

  if (!isLoading && isAuthenticated) return <Redirect to="/dashboard" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Error al iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      switchText="¿No tienes cuenta?"
      switchLinkText="Crear cuenta"
      switchHref="/registro"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm mx-auto">
        <h1 className="text-2xl font-semibold text-center">Iniciar sesión</h1>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Iniciando sesión…" : "Iniciar sesión"}
        </button>
      </form>
    </AuthLayout>
  );
}

function SignUpPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) sessionStorage.setItem("referral_pending", ref);
  }, []);

  if (!isLoading && isAuthenticated) return <Redirect to="/dashboard" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, displayName);
      navigate("/pendiente");
    } catch (err: any) {
      setError(err.message ?? "Error al crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      switchText="¿Ya tienes cuenta?"
      switchLinkText="Iniciar sesión"
      switchHref="/iniciar-sesion"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm mx-auto">
        <h1 className="text-2xl font-semibold text-center">Crear cuenta</h1>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="displayName" className="text-sm font-medium">Nombre</label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-md border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="reg-email" className="text-sm font-medium">Email</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="reg-password" className="text-sm font-medium">Contraseña</label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </AuthLayout>
  );
}

function RecuperarPage() {
  return (
    <AuthLayout
      switchText="¿Recuerdas tu contraseña?"
      switchLinkText="Iniciar sesión"
      switchHref="/iniciar-sesion"
    >
      <div className="flex flex-col gap-4 w-full max-w-sm mx-auto text-center">
        <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Para restablecer tu contraseña, contacta al administrador de la plataforma.
        </p>
        <a href="/iniciar-sesion" className="text-sm text-primary underline">
          Volver al inicio de sesión
        </a>
      </div>
    </AuthLayout>
  );
}

function HomeRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Redirect to="/dashboard" />;
  return <LandingPage />;
}

// ── Referral handler ──────────────────────────────────────────────────────────

function ReferralRedeemer() {
  const { isAuthenticated, getToken } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    const code = sessionStorage.getItem("referral_pending");
    if (!code) return;

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/referrals/use", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ code }),
        });
        if (res.ok || res.status === 400) {
          sessionStorage.removeItem("referral_pending");
        }
      } catch {
        // fail silently, will retry on next load
      }
    })();
  }, [isAuthenticated, getToken]);

  return null;
}

// ── Main app ──────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <ViewModeProvider>
        <ReferralRedeemer />
        <TooltipProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageSpinner />}>
              <Switch>
                <Route path="/" component={HomeRedirect} />

                <Route path="/iniciar-sesion/*?" component={SignInPage} />
                <Route path="/registro/*?" component={SignUpPage} />
                <Route path="/recuperar/*?" component={RecuperarPage} />

                <Route path="/sign-in/*?">
                  <Redirect to="/iniciar-sesion" />
                </Route>
                <Route path="/sign-up/*?">
                  <Redirect to="/registro" />
                </Route>

                <Route path="/403">
                  <Suspense fallback={<PageSpinner />}>
                    <ForbiddenPage />
                  </Suspense>
                </Route>

                <Route path="/pendiente">
                  <Suspense fallback={<PageSpinner />}>
                    <PendientePage />
                  </Suspense>
                </Route>

                <Route path="/rechazado">
                  <Suspense fallback={<PageSpinner />}>
                    <RechazadoPage />
                  </Suspense>
                </Route>

                <Route path="/m/:username">
                  {(params) => (
                    <Suspense fallback={<PageSpinner />}>
                      <TarjetaMiembroPage username={params.username as string} />
                    </Suspense>
                  )}
                </Route>

                <Route path="/dashboard">
                  <ProtectedRoute><DashboardPage /></ProtectedRoute>
                </Route>
                <Route path="/members">
                  <ProtectedRoute><MembersPage /></ProtectedRoute>
                </Route>
                <Route path="/members/:userId">
                  {(params) => (
                    <ProtectedRoute>
                      <MemberProfilePage userId={params.userId as string} />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route path="/miembros">
                  <ProtectedRoute><MiembrosPage /></ProtectedRoute>
                </Route>
                <Route path="/miembros/:username">
                  {(params) => (
                    <ProtectedRoute>
                      <MiembroPerfilPage username={params.username as string} />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route path="/eventos">
                  <ProtectedRoute><EventosPage /></ProtectedRoute>
                </Route>
                <Route path="/eventos/:slug">
                  {(params) => (
                    <ProtectedRoute>
                      <EventoDetallePage slug={params.slug as string} />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route path="/events">
                  <ProtectedRoute><EventsPage /></ProtectedRoute>
                </Route>
                <Route path="/events/:eventId">
                  <ProtectedRoute><Redirect to="/eventos" /></ProtectedRoute>
                </Route>
                <Route path="/forum">
                  <ProtectedRoute><ForumPage /></ProtectedRoute>
                </Route>
                <Route path="/forum/:postId">
                  {(params) => (
                    <ProtectedRoute>
                      <ForumPostPage postId={params.postId as string} />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route path="/foro">
                  <ProtectedRoute><ForoPage /></ProtectedRoute>
                </Route>
                <Route path="/foro/:categoria/:hilo">
                  {(params) => (
                    <ProtectedRoute>
                      <ForoHiloPage
                        categorySlug={params.categoria as string}
                        threadId={params.hilo as string}
                      />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route path="/foro/:categoria">
                  {(params) => (
                    <ProtectedRoute>
                      <ForoCategoriaPage slug={params.categoria as string} />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route path="/resources">
                  <ProtectedRoute><ResourcesPage /></ProtectedRoute>
                </Route>
                <Route path="/recursos/nuevo">
                  <ProtectedRoute><RecursoNuevoPage /></ProtectedRoute>
                </Route>
                <Route path="/recursos/:slug">
                  {(params) => (
                    <ProtectedRoute>
                      <RecursoDetallePage slug={params.slug as string} />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route path="/recursos">
                  <ProtectedRoute><RecursosPage /></ProtectedRoute>
                </Route>
                <Route path="/cursos/:slug">
                  {(params) => (
                    <ProtectedRoute>
                      <CursoDetallePage slug={params.slug as string} />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route path="/cursos">
                  <ProtectedRoute><CursosPage /></ProtectedRoute>
                </Route>
                <Route path="/marketplace/mis-anuncios">
                  <ProtectedRoute><MisAnunciosPage /></ProtectedRoute>
                </Route>
                <Route path="/marketplace/:slug">
                  {(params) => (
                    <ProtectedRoute>
                      <MarketplaceListingPage slug={params.slug as string} />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route path="/marketplace">
                  <ProtectedRoute><MarketplacePage /></ProtectedRoute>
                </Route>
                <Route path="/mensajes/:listingId/:otherUserId">
                  {(params) => (
                    <ProtectedRoute>
                      <MensajesThreadPage
                        listingId={params.listingId as string}
                        otherUserId={params.otherUserId as string}
                      />
                    </ProtectedRoute>
                  )}
                </Route>
                <Route path="/mensajes">
                  <ProtectedRoute><MessagesPage /></ProtectedRoute>
                </Route>
                <Route path="/messages">
                  <ProtectedRoute><Redirect to="/mensajes" /></ProtectedRoute>
                </Route>
                <Route path="/settings">
                  <ProtectedRoute><SettingsPage /></ProtectedRoute>
                </Route>
                <Route path="/perfil">
                  <ProtectedRoute><PerfilPage /></ProtectedRoute>
                </Route>
                <Route path="/cuenta/*?">
                  <ProtectedRoute><CuentaPage /></ProtectedRoute>
                </Route>
                <Route path="/notificaciones">
                  <ProtectedRoute><NotificacionesPage /></ProtectedRoute>
                </Route>
                <Route path="/perfil/preferencias">
                  <ProtectedRoute><PreferenciasNotificacionesPage /></ProtectedRoute>
                </Route>
                <Route path="/admin">
                  <ProtectedRoute>
                    <RequireAdmin><AdminPage /></RequireAdmin>
                  </ProtectedRoute>
                </Route>
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </ErrorBoundary>
          <Toaster />
          <SonnerToaster position="top-right" richColors theme="dark" />
        </TooltipProvider>
      </ViewModeProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <WouterRouter base={basePath}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </WouterRouter>
    </HelmetProvider>
  );
}

export default App;
