import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MapPin,
  Globe,
  Calendar,
  Shield,
  Users,
  MessageSquare,
  BookOpen,
  Zap,
  Copy,
  Check,
  UserCircle,
  Loader2,
  Lock,
  Download,
} from "lucide-react";
import { FaXTwitter, FaLinkedin, FaWhatsapp } from "react-icons/fa6";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type MemberCard = {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  role: "participant" | "administrator";
  location?: string | null;
  website?: string | null;
  skills: string[];
  joinedAt: string;
};

type MemberStats = {
  eventsAttended: number;
  threadsCreated: number;
  resourcesShared: number;
  memberSince: string;
};

export default function TarjetaMiembroPage({ username }: { username: string }) {
  const [card, setCard] = useState<MemberCard | null>(null);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    Promise.all([
      fetch(`${basePath}/api/public/users/${encodeURIComponent(username)}`),
      fetch(`${basePath}/api/public/users/${encodeURIComponent(username)}/stats`),
    ])
      .then(async ([cardRes, statsRes]) => {
        if (cancelled) return;
        if (!cardRes.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const [cardData, statsData] = await Promise.all([
          cardRes.json(),
          statsRes.ok ? statsRes.json() : Promise.resolve(null),
        ]);
        setCard(cardData);
        setStats(statsData);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  // ── Share / download actions (named for future analytics hooks) ──────────────

  const onDownloadCard = async () => {
    const el = cardRef.current;
    if (!el || !card) return;
    setDownloading(true);
    try {
      let dataUrl: string;
      try {
        dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true });
      } catch {
        // Fallback for iOS Safari (foreignObject + font issues)
        dataUrl = await toPng(el, { pixelRatio: 2, fontEmbedCSS: "" });
      }
      const a = document.createElement("a");
      a.download = `tarjeta-${card.username}.png`;
      a.href = dataUrl;
      a.click();
      toast.success("¡Tarjeta descargada!");
    } catch {
      // Final fallback: open OG image in new tab (iOS long-press to save)
      const ogUrl = `${window.location.origin}${basePath}/api/og/m/${encodeURIComponent(username)}`;
      window.open(ogUrl, "_blank");
      toast.info("Mantén pulsada la imagen para guardarla.");
    } finally {
      setDownloading(false);
    }
  };

  const onCopyCardLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const onShareTwitter = () => {
    const text = `Mira+mi+tarjeta+en+Comunidad+IA`;
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const onShareLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
  };

  const onShareWhatsApp = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://wa.me/?text=${url}`, "_blank");
  };

  // ── Loading / not-found states ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(224_71%_4%)] via-[hsl(224_71%_6%)] to-[hsl(270_50%_10%)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(224_71%_4%)] via-[hsl(224_71%_6%)] to-[hsl(270_50%_10%)] flex flex-col items-center justify-center gap-6 p-6 text-center">
        <Helmet>
          <title>Perfil no encontrado — IA Labs</title>
        </Helmet>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-6 w-6 text-primary" />
          <span className="font-bold text-foreground text-lg tracking-tight">IA Labs</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Lock className="h-14 w-14 text-muted-foreground/30" />
          <h1 className="text-xl font-bold text-foreground">Perfil no disponible</h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            Este perfil no existe o su propietario ha decidido hacerlo privado.
          </p>
        </div>
        <Link href={`${basePath}/`}>
          <Button variant="outline" size="sm">
            Conoce IA Labs
          </Button>
        </Link>
      </div>
    );
  }

  if (!card) return null;

  const isAdmin = card.role === "administrator";
  const ogTitle = `${card.displayName} en IA Labs`;
  const ogDescription =
    card.bio ??
    `Mira la tarjeta de miembro de @${card.username} en la comunidad hispana de IA.`;
  const canonicalUrl = `${window.location.origin}${basePath}/m/${encodeURIComponent(username)}`;
  const ogImageUrl = `${window.location.origin}${basePath}/api/og/m/${encodeURIComponent(username)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: card.displayName,
    ...(card.avatarUrl ? { image: card.avatarUrl } : {}),
    url: canonicalUrl,
    jobTitle: isAdmin ? "Administrador" : "Participante",
    ...(card.skills.length > 0 ? { knowsAbout: card.skills } : {}),
    memberOf: { "@type": "Organization", name: "Comunidad IA" },
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-[hsl(224_71%_4%)] via-[hsl(224_71%_6%)] to-[hsl(270_50%_10%)]">
        <Helmet>
          <title>{ogTitle}</title>
          <meta name="description" content={ogDescription} />
          <link rel="canonical" href={canonicalUrl} />

          <meta property="og:type" content="profile" />
          <meta property="og:title" content={ogTitle} />
          <meta property="og:description" content={ogDescription} />
          <meta property="og:url" content={canonicalUrl} />
          <meta property="og:image" content={ogImageUrl} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content={`Tarjeta de miembro de ${card.displayName}`} />
          <meta property="og:site_name" content="IA Labs" />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={ogTitle} />
          <meta name="twitter:description" content={ogDescription} />
          <meta name="twitter:image" content={ogImageUrl} />

          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>

        <div className="max-w-lg mx-auto px-4 py-12 flex flex-col gap-6">
          {/* Header brand + actions */}
          <div className="flex items-center justify-between gap-2">
            <Link href={`${basePath}/`}>
              <span className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                <Zap className="h-5 w-5 text-primary" />
                <span className="font-bold text-foreground tracking-tight text-sm">
                  IA Labs
                </span>
              </span>
            </Link>

            {/* Share actions */}
            <div className="flex items-center gap-1">
              {/* Copy link */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={onCopyCardLink}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-xs hidden sm:inline">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span className="text-xs hidden sm:inline">Copiar enlace</span>
                  </>
                )}
              </Button>

              {/* X / Twitter */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onShareTwitter}
                    aria-label="Compartir en X"
                  >
                    <FaXTwitter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Compartir en X</TooltipContent>
              </Tooltip>

              {/* LinkedIn */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onShareLinkedIn}
                    aria-label="Compartir en LinkedIn"
                  >
                    <FaLinkedin className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Compartir en LinkedIn</TooltipContent>
              </Tooltip>

              {/* WhatsApp */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onShareWhatsApp}
                    aria-label="Compartir en WhatsApp"
                  >
                    <FaWhatsapp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Compartir en WhatsApp</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Main card — ref attached for PNG download */}
          <div
            ref={cardRef}
            className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40"
          >
            {/* Gradient header strip */}
            <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/20 to-purple-500/20 relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(270_100%_60%/0.15),transparent_70%)]" />
            </div>

            {/* Avatar — overlaps header */}
            <div className="px-6 pb-6">
              <div className="-mt-12 mb-4">
                <Avatar className="h-20 w-20 rounded-xl ring-4 ring-card shadow-xl">
                  <AvatarImage src={card.avatarUrl ?? undefined} className="object-cover" />
                  <AvatarFallback className="text-3xl bg-primary/20 text-primary rounded-xl">
                    {card.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Name & role */}
              <div className="flex flex-wrap items-start gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground leading-tight">
                  {card.displayName}
                </h1>
                {isAdmin && (
                  <Badge variant="default" className="gap-1 mt-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground mb-1">
                {isAdmin ? "Administrador" : "Miembro"}
              </p>

              <p className="text-sm text-primary mb-3">@{card.username}</p>

              {card.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{card.bio}</p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                {card.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {card.location}
                  </span>
                )}
                {card.website && (
                  <a
                    href={card.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    {card.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Miembro{" "}
                  {formatDistanceToNow(new Date(card.joinedAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>

              {/* Skills */}
              {card.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {card.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Stats bar */}
            {stats && (
              <div className="border-t border-border/50 grid grid-cols-3 divide-x divide-border/50">
                <div className="flex flex-col items-center py-4 gap-1">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Users className="h-4 w-4" />
                    <span className="text-lg font-bold">{stats.eventsAttended}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Eventos
                  </span>
                </div>
                <div className="flex flex-col items-center py-4 gap-1">
                  <div className="flex items-center gap-1.5 text-primary">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-lg font-bold">{stats.threadsCreated}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Hilos
                  </span>
                </div>
                <div className="flex flex-col items-center py-4 gap-1">
                  <div className="flex items-center gap-1.5 text-primary">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-lg font-bold">{stats.resourcesShared}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Recursos
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Download button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={onDownloadCard}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? "Generando imagen…" : "Descargar tarjeta"}
          </Button>

          {/* CTA */}
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              ¿Quieres unirte a la comunidad hispana de IA?
            </p>
            <div className="flex gap-3 justify-center">
              <Link href={`${basePath}/registro`}>
                <Button size="sm" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Crear cuenta gratis
                </Button>
              </Link>
              <Link href={`${basePath}/miembros`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <UserCircle className="h-4 w-4" />
                  Ver directorio
                </Button>
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/50">
            Tarjeta generada por{" "}
            <Link href={`${basePath}/`}>
              <span className="text-primary/60 hover:text-primary cursor-pointer transition-colors">
                IA Labs
              </span>
            </Link>
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
