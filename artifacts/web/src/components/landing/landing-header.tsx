import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Zap, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "backdrop-blur-sm border-b border-border/40 bg-background/60"
          : "bg-transparent",
      ].join(" ")}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" aria-label="AI Community – inicio">
          <span className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm">
            <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-base font-light tracking-widest text-foreground uppercase">
              AI Community
            </span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-4">
          <Link
            href="/iniciar-sesion"
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Iniciar sesión
          </Link>
          <Button size="sm" className="rounded-sm text-xs uppercase tracking-widest" asChild>
            <Link href="/registro">Unirme gratis</Link>
          </Button>
        </nav>

        <button
          className="sm:hidden p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-border/40 bg-background/90 backdrop-blur-md px-6 py-4 flex flex-col gap-3">
          <Link
            href="/iniciar-sesion"
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors py-2"
            onClick={() => setMenuOpen(false)}
          >
            Iniciar sesión
          </Link>
          <Button className="w-full rounded-sm text-xs uppercase tracking-widest" asChild onClick={() => setMenuOpen(false)}>
            <Link href="/registro">Unirme gratis</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
