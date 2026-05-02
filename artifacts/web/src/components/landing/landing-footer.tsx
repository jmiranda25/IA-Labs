import { Link } from "wouter";
import { Zap } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-border" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" aria-label="AI Community – inicio">
            <span className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm">
              <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-foreground">AI Community</span>
            </span>
          </Link>

          <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              { label: "Foro", href: "/forum" },
              { label: "Eventos", href: "/events" },
              { label: "Recursos", href: "/resources" },
              { label: "Marketplace", href: "/marketplace" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              >
                {label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} AI Community. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
