import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import MembersPage from "@/pages/members";
import MemberProfilePage from "@/pages/member-profile";
import EventsPage from "@/pages/events";
import EventDetailPage from "@/pages/event-detail";
import ForumPage from "@/pages/forum";
import ForumPostPage from "@/pages/forum-post";
import ResourcesPage from "@/pages/resources";
import MarketplacePage from "@/pages/marketplace";
import MarketplaceListingPage from "@/pages/marketplace-listing";
import MessagesPage from "@/pages/messages";
import SettingsPage from "@/pages/settings";
import AdminPage from "@/pages/admin";

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
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
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
    cardBox: "bg-[hsl(224_71%_6%)] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[hsl(216_34%_17%)]",
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
    logoBox: "mb-2",
    logoImage: "h-8 w-auto",
    socialButtonsBlockButton: "!border-[hsl(216_34%_17%)] hover:!border-[hsl(270_100%_60%)]",
    formButtonPrimary: "!bg-[hsl(270_100%_60%)] hover:!bg-[hsl(270_100%_65%)]",
    formFieldInput: "!bg-[hsl(216_34%_17%)] !border-[hsl(216_34%_25%)] !text-[hsl(213_31%_91%)]",
    footerAction: "!bg-transparent",
    dividerLine: "!bg-[hsl(216_34%_17%)]",
    alert: "!border-[hsl(216_34%_17%)]",
    otpCodeFieldInput: "!bg-[hsl(216_34%_17%)] !border-[hsl(216_34%_25%)]",
    formFieldRow: "",
    main: "",
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

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
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

function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
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
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your AI Community account" } },
        signUp: { start: { title: "Join AI Community", subtitle: "Connect, collaborate, and grow" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/registro/*?" component={SignUpPage} />
            <Route path="/dashboard">
              <AuthGuard><DashboardPage /></AuthGuard>
            </Route>
            <Route path="/members">
              <AuthGuard><MembersPage /></AuthGuard>
            </Route>
            <Route path="/members/:userId">
              {(params) => <AuthGuard><MemberProfilePage userId={params.userId} /></AuthGuard>}
            </Route>
            <Route path="/events">
              <AuthGuard><EventsPage /></AuthGuard>
            </Route>
            <Route path="/events/:eventId">
              {(params) => <AuthGuard><EventDetailPage eventId={params.eventId} /></AuthGuard>}
            </Route>
            <Route path="/forum">
              <AuthGuard><ForumPage /></AuthGuard>
            </Route>
            <Route path="/forum/:postId">
              {(params) => <AuthGuard><ForumPostPage postId={params.postId} /></AuthGuard>}
            </Route>
            <Route path="/resources">
              <AuthGuard><ResourcesPage /></AuthGuard>
            </Route>
            <Route path="/marketplace">
              <AuthGuard><MarketplacePage /></AuthGuard>
            </Route>
            <Route path="/marketplace/:listingId">
              {(params) => <AuthGuard><MarketplaceListingPage listingId={params.listingId} /></AuthGuard>}
            </Route>
            <Route path="/messages">
              <AuthGuard><MessagesPage /></AuthGuard>
            </Route>
            <Route path="/settings">
              <AuthGuard><SettingsPage /></AuthGuard>
            </Route>
            <Route path="/admin">
              <AuthGuard><AdminPage /></AuthGuard>
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
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
