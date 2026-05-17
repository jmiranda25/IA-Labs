import { useState } from "react";
import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import {
  useGetMe,
  useListNotifications,
  useMarkAllNotificationsRead,
  useGetNotificationsUnreadCount,
  getListNotificationsQueryKey,
  getGetNotificationsUnreadCountQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell, Menu, LayoutDashboard, Users, Calendar, MessageSquare,
  BookOpen, ShoppingBag, MessageCircle, Settings, Shield, X,
  BellRing, User, Eye, GraduationCap,
} from "lucide-react";
import { useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/react";
import { toast } from "sonner";
import { useViewMode } from "@/contexts/view-mode";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const navItems = [
  { href: "/dashboard",       label: "Dashboard",       icon: LayoutDashboard },
  { href: "/miembros",        label: "Miembros",        icon: Users },
  { href: "/eventos",         label: "Eventos",         icon: Calendar },
  { href: "/foro",            label: "Foro",            icon: MessageSquare },
  { href: "/recursos",        label: "Recursos",        icon: BookOpen },
  { href: "/cursos",          label: "Cursos",          icon: GraduationCap },
  { href: "/marketplace",     label: "Marketplace",     icon: ShoppingBag },
  { href: "/mensajes",        label: "Mensajes",        icon: MessageCircle },
  { href: "/notificaciones",  label: "Notificaciones",  icon: BellRing },
];

function NotificationBell() {
  const { data: notifsData } = useListNotifications({ unreadOnly: false, limit: 10 });
  const { data: unreadData } = useGetNotificationsUnreadCount();
  const markAllRead = useMarkAllNotificationsRead();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const backoffRef = useRef(1000);
  const { user } = useUser();

  const invalidateAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListNotificationsQueryKey({ unreadOnly: false, limit: 10 }) });
    qc.invalidateQueries({ queryKey: getGetNotificationsUnreadCountQueryKey() });
  }, [qc]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const es = new EventSource(`${basePath}/api/notifications/stream`, { withCredentials: true });
      eventSourceRef.current = es;

      es.addEventListener("notification", (e: MessageEvent) => {
        try {
          const n = JSON.parse(e.data) as { title: string; body: string; link?: string };
          invalidateAll();
          window.dispatchEvent(new CustomEvent("sse-notification", { detail: n }));
          toast(n.title, {
            description: n.body,
            action: n.link
              ? { label: "Ver", onClick: () => { window.location.href = `${basePath}${n.link}`; } }
              : undefined,
          });
        } catch { /* ignore malformed */ }
      });

      es.addEventListener("role_changed", () => {
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        if (!cancelled) {
          setTimeout(() => {
            backoffRef.current = Math.min(backoffRef.current * 2, 30000);
            connect();
          }, backoffRef.current);
        }
      };

      es.onopen = () => {
        backoffRef.current = 1000;
      };
    }

    connect();
    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [user, invalidateAll]);

  const unread = unreadData?.count ?? notifsData?.unreadCount ?? 0;
  const notifications = notifsData?.notifications ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <span className="text-sm font-semibold">Notificaciones</span>
          {unread > 0 && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => {
                markAllRead.mutate(undefined, {
                  onSuccess: () => {
                    qc.invalidateQueries({ queryKey: getListNotificationsQueryKey({ unreadOnly: false, limit: 10 }) });
                    qc.invalidateQueries({ queryKey: getGetNotificationsUnreadCountQueryKey() });
                  },
                });
              }}
              data-testid="button-mark-all-read"
            >
              Marcar todas leídas
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="h-7 w-7 mx-auto mb-2 opacity-30" />
              Sin notificaciones
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n: any) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/notificaciones"}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2.5 hover:bg-muted/50 transition-colors ${!n.isRead ? "bg-primary/5" : ""}`}
                >
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t border-border px-3 py-2">
          <Link href="/notificaciones" onClick={() => setOpen(false)}>
            <span className="text-xs text-primary hover:underline cursor-pointer">
              Ver todas las notificaciones →
            </span>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: me } = useGetMe();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { viewAsUser, exitUserView } = useViewMode();

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-0.5">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = location === href || location.startsWith(href + "/");
        return (
          <Link key={href} href={href} onClick={onClick}>
            <span
              className={`flex items-center gap-3 px-3 py-2 text-[11px] font-medium uppercase tracking-widest transition-colors cursor-pointer ${
                active
                  ? "border-l-2 border-primary text-white pl-[10px]"
                  : "text-muted-foreground hover:text-foreground border-l-2 border-transparent pl-[10px]"
              }`}
              data-testid={`nav-${label.toLowerCase()}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {label}
            </span>
          </Link>
        );
      })}
      {me?.role === "administrator" && !viewAsUser && (
        <Link href="/admin" onClick={onClick}>
          <span
            className={`flex items-center gap-3 px-3 py-2 text-[11px] font-medium uppercase tracking-widest transition-colors cursor-pointer ${
              location === "/admin" || location.startsWith("/admin/")
                ? "border-l-2 border-primary text-white pl-[10px]"
                : "text-muted-foreground hover:text-foreground border-l-2 border-transparent pl-[10px]"
            }`}
            data-testid="nav-admin"
          >
            <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Admin
          </span>
        </Link>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border/60 bg-muted/20">
        <div className="flex h-14 items-center px-4 border-b border-border/60">
          <span className="text-xs font-light tracking-[0.2em] text-foreground uppercase">✦ AI Community</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-1">
          <NavLinks />
        </div>
        <div className="border-t border-border/60 py-3 px-1 space-y-0.5">
          <Link href="/perfil">
            <span className={`flex items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-widest transition-colors cursor-pointer ${location === "/perfil" ? "border-l-2 border-primary text-white pl-[10px]" : "text-muted-foreground hover:text-foreground border-l-2 border-transparent pl-[10px]"}`} data-testid="nav-perfil">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              Mi perfil
            </span>
          </Link>
          {me?.username && (
            <Link href={`/m/${me.username}`}>
              <span className="flex items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-l-2 border-transparent pl-[10px]" data-testid="nav-tarjeta">
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                Ver mi tarjeta
              </span>
            </Link>
          )}
          <Link href="/settings">
            <span className="flex items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-l-2 border-transparent pl-[10px]" data-testid="nav-settings">
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              Configuración
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex h-14 items-center gap-3 border-b border-border/60 bg-background/95 backdrop-blur px-4 sticky top-0 z-40">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col bg-muted/20">
              <div className="flex h-14 items-center px-4 border-b border-border/60 shrink-0">
                <span className="text-xs font-light tracking-[0.2em] text-foreground uppercase">✦ AI Community</span>
                <button className="ml-auto" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" data-testid="button-close-menu">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-4 px-1">
                <NavLinks onClick={() => setMobileOpen(false)} />
              </div>
              <div className="border-t border-border/60 py-3 px-1 space-y-0.5 shrink-0">
                <Link href="/perfil" onClick={() => setMobileOpen(false)}>
                  <span className={`flex items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-widest transition-colors cursor-pointer ${location === "/perfil" ? "border-l-2 border-primary text-white pl-[10px]" : "text-muted-foreground hover:text-foreground border-l-2 border-transparent pl-[10px]"}`}>
                    <User className="h-3.5 w-3.5" aria-hidden="true" />
                    Mi perfil
                  </span>
                </Link>
                <Link href="/settings" onClick={() => setMobileOpen(false)}>
                  <span className={`flex items-center gap-3 px-3 py-2 text-[10px] uppercase tracking-widest transition-colors cursor-pointer ${location === "/settings" ? "border-l-2 border-primary text-white pl-[10px]" : "text-muted-foreground hover:text-foreground border-l-2 border-transparent pl-[10px]"}`}>
                    <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                    Configuración
                  </span>
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          {/* Brand mark (mobile only) */}
          <div className="flex items-center gap-2 lg:hidden">
            <span className="text-[11px] font-light tracking-[0.2em] text-foreground uppercase">✦ AI Community</span>
          </div>

          <div className="flex-1" />

          <NotificationBell />

          {/* User area */}
          <div className="flex items-center gap-2 pl-1">
            <Link href="/perfil">
              <div className="hidden sm:flex flex-col items-end leading-tight cursor-pointer">
                <span className="text-sm font-medium max-w-[140px] truncate text-foreground hover:text-primary transition-colors">
                  {me?.displayName}
                </span>
                {me && (
                  <span className="text-[11px] text-muted-foreground">
                    {me.role === "administrator" && !viewAsUser ? "Admin" : "Miembro"}
                  </span>
                )}
              </div>
            </Link>
            <UserButton
              userProfileMode="navigation"
              userProfileUrl={`${basePath}/cuenta`}
              appearance={{
                elements: { avatarBox: "h-7 w-7" },
              }}
            />
          </div>
        </header>

        {/* View-as-user banner */}
        {viewAsUser && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/25 shrink-0">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs">
              <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Estás viendo la plataforma como usuario regular</span>
            </div>
            <button
              onClick={exitUserView}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2 shrink-0"
            >
              Salir del modo usuario
            </button>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
