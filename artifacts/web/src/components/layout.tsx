import { useState } from "react";
import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { useGetMe, useListNotifications, useMarkAllNotificationsRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Bell, Menu, LayoutDashboard, Users, Calendar, MessageSquare,
  BookOpen, ShoppingBag, MessageCircle, Settings, Shield, Zap, X,
  BellRing, User,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useUser } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const navItems = [
  { href: "/dashboard",       label: "Dashboard",       icon: LayoutDashboard },
  { href: "/members",         label: "Miembros",        icon: Users },
  { href: "/events",          label: "Eventos",         icon: Calendar },
  { href: "/forum",           label: "Foro",            icon: MessageSquare },
  { href: "/resources",       label: "Recursos",        icon: BookOpen },
  { href: "/marketplace",     label: "Marketplace",     icon: ShoppingBag },
  { href: "/messages",        label: "Mensajes",        icon: MessageCircle },
  { href: "/notificaciones",  label: "Notificaciones",  icon: BellRing },
];

function NotificationBell() {
  const { data: notifsData } = useListNotifications({ unreadOnly: false, limit: 10 });
  const markAllRead = useMarkAllNotificationsRead();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;
    const es = new EventSource(`${basePath}/api/notifications/stream`, { withCredentials: true });
    eventSourceRef.current = es;
    es.onmessage = () => {
      qc.invalidateQueries({ queryKey: getListNotificationsQueryKey({ unreadOnly: false, limit: 10 }) });
    };
    return () => { es.close(); eventSourceRef.current = null; };
  }, [user, qc]);

  const unread = notifsData?.unreadCount ?? 0;
  const notifications = notifsData?.notifications ?? [];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notificaciones</span>
          {unread > 0 && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => {
                markAllRead.mutate(undefined, {
                  onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey({ unreadOnly: false, limit: 10 }) }),
                });
              }}
              data-testid="button-mark-all-read"
            >
              Marcar todas leídas
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Sin notificaciones</div>
        ) : (
          notifications.map((n: any) => (
            <DropdownMenuItem key={n.id} asChild>
              <Link href={n.link ?? "#"} className={`block px-3 py-2 ${!n.isRead ? "bg-primary/5" : ""}`}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: me } = useGetMe();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="space-y-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = location === href || location.startsWith(href + "/");
        return (
          <Link key={href} href={href} onClick={onClick}>
            <span
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              data-testid={`nav-${label.toLowerCase()}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </span>
          </Link>
        );
      })}
      {me?.role === "administrator" && (
        <Link href="/admin" onClick={onClick}>
          <span
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
              location === "/admin" || location.startsWith("/admin/")
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            data-testid="nav-admin"
          >
            <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
            Admin
          </span>
        </Link>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 px-4 border-b border-border">
          <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="font-bold text-foreground tracking-tight">AI Community</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="border-t border-border p-3 space-y-1">
          <Link href={`/members/${me?.clerkId}`}>
            <span className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" data-testid="nav-profile">
              <User className="h-4 w-4" aria-hidden="true" />
              Ver perfil
            </span>
          </Link>
          <Link href="/settings">
            <span className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" data-testid="nav-settings">
              <Settings className="h-4 w-4" aria-hidden="true" />
              Configuración
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 sticky top-0 z-40">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-14 items-center gap-2 px-4 border-b border-border">
                <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="font-bold tracking-tight">AI Community</span>
                <button className="ml-auto" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" data-testid="button-close-menu">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-3">
                <NavLinks onClick={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          {/* Brand mark (mobile only) */}
          <div className="flex items-center gap-2 lg:hidden">
            <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-bold text-sm tracking-tight">AI Community</span>
          </div>

          <div className="flex-1" />

          <NotificationBell />

          {/* User area */}
          <div className="flex items-center gap-2 pl-1">
            <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate text-foreground">
              {me?.displayName}
            </span>
            <UserButton
              appearance={{
                elements: { avatarBox: "h-7 w-7" },
              }}
            />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
