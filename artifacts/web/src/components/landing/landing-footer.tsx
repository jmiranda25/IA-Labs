import { Link } from "wouter";
import { Zap } from "lucide-react";

const footerLinks = [
  {
    heading: "Producto",
    links: [
      { label: "Eventos", href: "/events" },
      { label: "Foro", href: "/forum" },
      { label: "Recursos", href: "/resources" },
      { label: "Marketplace", href: "/marketplace" },
    ],
  },
  {
    heading: "Comunidad",
    links: [
      { label: "Sobre nosotros", href: "#" },
      { label: "Código de conducta", href: "#" },
      { label: "Contacto", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Términos", href: "#" },
      { label: "Privacidad", href: "#" },
    ],
  },
  {
    heading: "Redes",
    links: [
      { label: "X (Twitter)", href: "#" },
      { label: "LinkedIn", href: "#" },
      { label: "YouTube", href: "#" },
      { label: "Discord", href: "#" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        {/* Top: logo + columns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" aria-label="AI Community — inicio">
              <span className="flex items-center gap-2 mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm w-fit">
                <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="font-bold text-foreground">AI Community</span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              La comunidad de IA en español para builders, founders y profesionales.
            </p>
          </div>

          {/* Link columns */}
          {footerLinks.map(({ heading, links }) => (
            <nav key={heading} aria-label={`${heading} links`}>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                {heading}
              </p>
              <ul className="flex flex-col gap-2.5" role="list">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom: copyright */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} AI Community. Todos los derechos reservados.
          </p>
          <p className="text-xs text-muted-foreground/40">
            Hecho con ❤️ para la comunidad hispanohablante de IA
          </p>
        </div>
      </div>
    </footer>
  );
}
