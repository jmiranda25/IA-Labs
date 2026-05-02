import { Link } from "wouter";
import { useGetCommunityStats, useGetLandingContent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Users, Calendar, MessageSquare, BookOpen, ShoppingBag, ArrowRight, Star } from "lucide-react";

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-primary tabular-nums">{value.toLocaleString?.() ?? value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

const features = [
  { icon: Users, title: "Member Directory", desc: "Discover AI practitioners worldwide. Search by skill, role, or location." },
  { icon: Calendar, title: "Events & RSVPs", desc: "Virtual and in-person meetups, workshops, and conferences." },
  { icon: MessageSquare, title: "Forum Discussions", desc: "Threaded conversations on research, tools, ethics, and more." },
  { icon: BookOpen, title: "Resource Library", desc: "Papers, datasets, tutorials, and tools shared by the community." },
  { icon: ShoppingBag, title: "Marketplace", desc: "Offer services, find collaborators, and hire AI talent." },
  { icon: Zap, title: "Real-time Notifications", desc: "Stay up to date with activity that matters to you." },
];

export default function LandingPage() {
  const { data: stats } = useGetCommunityStats();
  const { data: sections } = useGetLandingContent();

  const hero = (sections as any[])?.find((s: any) => s.section === "hero")?.content ?? {};
  const headline = hero.headline ?? "Connect, collaborate, and grow with AI practitioners";
  const subtitle = hero.subtitle ?? "Join a thriving community of builders, researchers, and enthusiasts pushing the boundaries of artificial intelligence.";
  const cta = hero.cta ?? "Join the Community";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">AI Community</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in" data-testid="link-sign-in">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-up" data-testid="link-sign-up">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 pt-24 pb-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none rounded-b-3xl" />
        <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1">
          <Star className="h-3 w-3 text-primary" />
          <span className="text-xs">The home for AI practitioners</span>
        </Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6 max-w-4xl mx-auto leading-tight" data-testid="text-hero-headline">
          {headline}
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
          {subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="gap-2" asChild>
            <Link href="/sign-up" data-testid="button-cta-primary">
              {cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/sign-in" data-testid="button-cta-secondary">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="max-w-4xl mx-auto px-4 pb-20">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 p-8 rounded-2xl border border-border bg-card">
            <StatCard value={stats.memberCount} label="Members" />
            <StatCard value={stats.eventCount} label="Events" />
            <StatCard value={stats.forumPostCount} label="Forum Posts" />
            <StatCard value={stats.resourceCount} label="Resources" />
            <StatCard value={stats.listingCount} label="Listings" />
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <h2 className="text-2xl font-bold text-center mb-2">Everything you need to thrive in AI</h2>
        <p className="text-muted-foreground text-center mb-12">Curated tools for every stage of your AI journey.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors group">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 border border-primary/20 p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to join the conversation?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Create your free account and start connecting with AI practitioners today.</p>
          <Button size="lg" asChild>
            <Link href="/sign-up" data-testid="button-cta-footer">Get started for free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Community</span>
          </div>
          <p className="text-xs text-muted-foreground">Built for AI practitioners everywhere</p>
        </div>
      </footer>
    </div>
  );
}
