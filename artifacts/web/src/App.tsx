import { lazy, Suspense, useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { DemoBanner } from "@/components/demo-banner";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { esES } from "@clerk/localizations";
import { shadcn } from "@clerk/themes";
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

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "hsl(270 100% 60%)",
    colorForeground: "hsl(213 31% 91%)",
    colorMutedForeground: "hsl(215 20% 65%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(224 71% 6%)",
    colorInput: "hsl(216 34% 17%)",
    colorInputForeground: "hsl(213 31% 91%)",
    colorNeutral: "hsl(216 34% 17%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-[hsl(224_71%_6%)] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[hsl(216_34%_17%)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[hsl(213_31%_91%)] font-semibold",
    headerSubtitle: "text-[hsl(215_20%_65%)]",
    socialButtonsBlockButtonText: "text-[hsl(213_31%_91%)]",
    formFieldLabel: "text-[hsl(213_31%_91%)]",
    footerActionLink: "text-[hsl(270_100%_70%)]",
    footerActionText: "text-[hsl(215_20%_65%)]",
    dividerText: "text-[hsl(215_20%_65%)]",
    identityPreviewEditButton: "text-[hsl(270_100%_70%)]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-[hsl(213_31%_91%)]",
    socialButtonsBlockButton:
      "!border-[hsl(216_34%_17%)] hover:!border-[hsl(270_100%_60%)]",
    formButtonPrimary:
      "!bg-[hsl(270_100%_60%)] hover:!bg-[hsl(270_100%_65%)]",
    formFieldInput:
      "!bg-[hsl(216_34%_17%)] !border-[hsl(216_34%_25%)] !text-[hsl(213_31%_91%)]",
    footerAction: "!bg-transparent",
    dividerLine: "!bg-[hsl(216_34%_17%)]",
    alert: "!border-[hsl(216_34%_17%)]",
    otpCodeFieldInput:
      "!bg-[hsl(216_34%_17%)] !border-[hsl(216_34%_25%)]",
  },
};

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

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function GuestOnlyPage({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">{children}</Show>
    </>
  );
}

function SignInPage() {
  const demoEmail =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("email") ?? undefined
      : undefined;

  return (
    <GuestOnlyPage>
      <AuthLayout
        switchText="¿No tienes cuenta?"
        switchLinkText="Crear cuenta"
        switchHref="/registro"
        footer={<DemoBanner />}
      >
        <SignIn
          key={demoEmail ?? "default"}
          routing="path"
          path={`${basePath}/iniciar-sesion`}
          signUpUrl={`${basePath}/registro`}
          forceRedirectUrl={`${basePath}/dashboard`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
          initialValues={demoEmail ? { emailAddress: demoEmail } : undefined}
        />
      </AuthLayout>
    </GuestOnlyPage>
  );
}

function SignUpPage() {
  return (
    <GuestOnlyPage>
      <AuthLayout
        switchText="¿Ya tienes cuenta?"
        switchLinkText="Iniciar sesión"
        switchHref="/iniciar-sesion"
      >
        <SignUp
          routing="path"
          path={`${basePath}/registro`}
          signInUrl={`${basePath}/iniciar-sesion`}
          forceRedirectUrl={`${basePath}/dashboard`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
        />
      </AuthLayout>
    </GuestOnlyPage>
  );
}

function RecuperarPage() {
  return (
    <GuestOnlyPage>
      <AuthLayout
        switchText="¿Recuerdas tu contraseña?"
        switchLinkText="Iniciar sesión"
        switchHref="/iniciar-sesion"
      >
        <SignIn
          routing="path"
          path={`${basePath}/recuperar`}
          signUpUrl={`${basePath}/registro`}
          forceRedirectUrl={`${basePath}/dashboard`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
        />
      </AuthLayout>
    </GuestOnlyPage>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={esES}
      signInUrl={`${basePath}/iniciar-sesion`}
      signUpUrl={`${basePath}/registro`}
      signInFallbackRedirectUrl={`${basePath}/dashboard`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
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
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </HelmetProvider>
  );
}

export default App;
