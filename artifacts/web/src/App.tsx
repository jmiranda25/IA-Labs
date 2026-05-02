import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { esES } from "@clerk/localizations";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthLayout } from "@/components/auth-layout";
import { ProtectedRoute, RequireAdmin } from "@/components/protected-route";
import { queryClient } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import MembersPage from "@/pages/members";
import MemberProfilePage from "@/pages/member-profile";
import MiembrosPage from "@/pages/miembros";
import MiembroPerfilPage from "@/pages/miembro-perfil";
import EventsPage from "@/pages/events";
import EventDetailPage from "@/pages/event-detail";
import EventosPage from "@/pages/eventos";
import EventoDetallePage from "@/pages/evento-detalle";
import ForumPage from "@/pages/forum";
import ForumPostPage from "@/pages/forum-post";
import ForoPage from "@/pages/foro";
import ForoCategoriaPage from "@/pages/foro-categoria";
import ForoHiloPage from "@/pages/foro-hilo";
import ResourcesPage from "@/pages/resources";
import RecursosPage from "@/pages/recursos";
import RecursoDetallePage from "@/pages/recurso-detalle";
import RecursoNuevoPage from "@/pages/recurso-nuevo";
import MarketplacePage from "@/pages/marketplace";
import MarketplaceListingPage from "@/pages/marketplace-listing";
import MessagesPage from "@/pages/messages";
import SettingsPage from "@/pages/settings";
import PerfilPage from "@/pages/perfil";
import AdminPage from "@/pages/admin";
import NotificacionesPage from "@/pages/notificaciones";

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

/** Redirect signed-in users away from auth pages */
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
  return (
    <GuestOnlyPage>
      <AuthLayout
        switchText="¿No tienes cuenta?"
        switchLinkText="Crear cuenta"
        switchHref="/registro"
      >
        <SignIn
          routing="path"
          path={`${basePath}/iniciar-sesion`}
          signUpUrl={`${basePath}/registro`}
          forceRedirectUrl={`${basePath}/dashboard`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
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

/** /recuperar — Clerk's "Forgot password?" flow lives inside <SignIn> */
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
          <Switch>
            <Route path="/" component={HomeRedirect} />

            {/* Spanish auth routes (canonical) */}
            <Route path="/iniciar-sesion/*?" component={SignInPage} />
            <Route path="/registro/*?" component={SignUpPage} />
            <Route path="/recuperar/*?" component={RecuperarPage} />

            {/* Legacy English routes → redirect to Spanish equivalents */}
            <Route path="/sign-in/*?">
              <Redirect to="/iniciar-sesion" />
            </Route>
            <Route path="/sign-up/*?">
              <Redirect to="/registro" />
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
            {/* Spanish events routes (canonical) */}
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
            {/* Legacy English routes → redirect */}
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
            <Route path="/marketplace">
              <ProtectedRoute><MarketplacePage /></ProtectedRoute>
            </Route>
            <Route path="/marketplace/:listingId">
              {(params) => (
                <ProtectedRoute>
                  <MarketplaceListingPage listingId={params.listingId as string} />
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/messages">
              <ProtectedRoute><MessagesPage /></ProtectedRoute>
            </Route>
            <Route path="/settings">
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
            </Route>
            <Route path="/perfil">
              <ProtectedRoute><PerfilPage /></ProtectedRoute>
            </Route>
            <Route path="/notificaciones">
              <ProtectedRoute><NotificacionesPage /></ProtectedRoute>
            </Route>
            <Route path="/admin">
              <ProtectedRoute>
                <RequireAdmin><AdminPage /></RequireAdmin>
              </ProtectedRoute>
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
          <SonnerToaster position="top-right" richColors theme="dark" />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
