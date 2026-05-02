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
          ? "bg-background/90 backdrop-blur-md border-b border-border/60 shadow-sm"
          : "bg-transparent",
      ].join(" ")}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" aria-label="AI Community – go to home">
          <span className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm">
            <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-bold tracking-tight text-foreground">AI Community</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/registro">Unirme gratis</Link>
          </Button>
        </nav>

        <button
          className="sm:hidden p-2 rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-border bg-background/95 backdrop-blur-md px-4 py-4 flex flex-col gap-2">
          <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setMenuOpen(false)}>
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>
          <Button className="w-full" asChild onClick={() => setMenuOpen(false)}>
            <Link href="/registro">Unirme gratis</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
