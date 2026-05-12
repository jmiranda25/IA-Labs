import { Link } from "wouter";

const footerLinks = [
  {
    heading: "Producto",
    links: [
      { label: "Eventos", href: "/eventos" },
      { label: "Foro", href: "/foro" },
      { label: "Recursos", href: "/recursos" },
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
    <footer className="border-t border-border/30" role="contentinfo">
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-16">
        {/* Top: brand + columns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-8 mb-14">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" aria-label="AI Community — inicio">
              <span className="flex items-center gap-2 mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm w-fit">
                <span className="text-primary text-sm leading-none" aria-hidden="true">✦</span>
                <span className="text-[10px] font-light tracking-[0.3em] text-white uppercase">
                  AI Community
                </span>
              </span>
            </Link>
            <p className="text-[10px] text-muted-foreground leading-relaxed tracking-wide">
              La comunidad de IA en español para builders, founders y profesionales.
            </p>
          </div>

          {/* Link columns */}
          {footerLinks.map(({ heading, links }) => (
            <nav key={heading} aria-label={`${heading} links`}>
              <p className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-[0.25em] mb-5">
                {heading}
              </p>
              <ul className="flex flex-col gap-3" role="list">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
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
        <div className="border-t border-border/30 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40">
            © {new Date().getFullYear()} AI Community — Todos los derechos reservados
          </p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/30">
            Hecho para la comunidad hispanohablante de IA
          </p>
        </div>
      </div>
    </footer>
  );
}
