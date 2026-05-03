import { Link } from "wouter";
import { Zap } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  switchText: string;
  switchLinkText: string;
  switchHref: string;
  footer?: React.ReactNode;
}

export function AuthLayout({
  children,
  switchText,
  switchLinkText,
  switchHref,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 overflow-hidden">
      {/* Ambient glows */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[500px] rounded-full bg-[hsl(190_100%_50%)]/5 blur-[80px]" />
      </div>

      <div className="relative w-full max-w-[440px]">
        {/* Top bar: logo + switch link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            aria-label="AI Community — inicio"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
          >
            <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-bold text-foreground text-sm">AI Community</span>
          </Link>

          <p className="text-sm text-muted-foreground">
            {switchText}{" "}
            <Link
              href={switchHref}
              className="text-primary hover:text-primary/80 underline-offset-4 hover:underline font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              {switchLinkText}
            </Link>
          </p>
        </div>

        {/* Clerk card */}
        {children}

        {/* Optional footer slot (e.g. demo banner) */}
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </div>
  );
}
