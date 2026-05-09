import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Eventos", href: "/eventos" },
  { label: "Foro", href: "/foro" },
  { label: "Recursos", href: "/recursos" },
  { label: "Marketplace", href: "/marketplace" },
];

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
          ? "backdrop-blur-md border-b border-white/10"
          : "backdrop-blur-none",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between gap-8">

        {/* Logo */}
        <Link href="/" aria-label="AI Community – inicio">
          <span className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm">
            <span className="text-primary text-base leading-none">✦</span>
            <span className="text-[11px] font-light tracking-[0.3em] text-white uppercase">
              AI Community
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-6 flex-1">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden sm:flex items-center gap-4">
          <Link
            href="/iniciar-sesion"
            className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="rounded-none bg-primary text-white text-[10px] tracking-widest uppercase px-5 py-2 hover:bg-primary/90 transition-colors"
          >
            Unirse gratis
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-white/10 bg-background/90 backdrop-blur-md px-6 py-4 flex flex-col gap-3">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors py-2"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
            <Link
              href="/iniciar-sesion"
              className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors py-2"
              onClick={() => setMenuOpen(false)}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-none bg-primary text-white text-[10px] tracking-widest uppercase px-5 py-2 text-center hover:bg-primary/90 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Unirse gratis
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
