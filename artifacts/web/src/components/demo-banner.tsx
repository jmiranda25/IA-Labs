import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { X, Copy, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-credentials";

const STORAGE_KEY = "demo_banner_dismissed";

interface DemoBannerProps {
  variant?: "inline" | "floating";
}

export function DemoBanner({ variant = "inline" }: DemoBannerProps) {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (dismissed) {
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // ignore
      }
    }
  }, [dismissed]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore
    }
  }, []);

  const handleLoginAs = useCallback(
    (email: string) => {
      const params = new URLSearchParams({ email });
      setLocation(`/iniciar-sesion?${params.toString()}`);
    },
    [setLocation],
  );

  if (dismissed) return null;

  if (variant === "floating") {
    return (
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl">
        <BannerCard
          onDismiss={handleDismiss}
          onLoginAs={handleLoginAs}
          onCopy={copyToClipboard}
          copiedField={copiedField}
        />
      </div>
    );
  }

  return (
    <BannerCard
      onDismiss={handleDismiss}
      onLoginAs={handleLoginAs}
      onCopy={copyToClipboard}
      copiedField={copiedField}
    />
  );
}

interface BannerCardProps {
  onDismiss: () => void;
  onLoginAs: (email: string) => void;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}

function BannerCard({ onDismiss, onLoginAs, onCopy, copiedField }: BannerCardProps) {
  return (
    <div
      role="region"
      aria-label="Acceso demo"
      className="relative rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar banner de demo"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="mb-3 flex items-center gap-2 pr-6">
        <Zap className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="font-semibold text-foreground">Prueba la demo — accede al instante</p>
      </div>

      <div className="mb-3 space-y-2">
        {DEMO_ACCOUNTS.map((account) => (
          <div key={account.email} className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onLoginAs(account.email)}
              className="h-8 shrink-0 border-primary/40 bg-primary/10 text-xs text-foreground hover:border-primary hover:bg-primary/20"
            >
              Entrar como {account.label}
            </Button>
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
              <code className="truncate font-mono text-xs text-muted-foreground">
                {account.email}
              </code>
              <button
                type="button"
                onClick={() => onCopy(account.email, `email-${account.email}`)}
                aria-label={`Copiar email de ${account.displayName}`}
                className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {copiedField === `email-${account.email}` ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5">
        <span className="text-muted-foreground">Contraseña:</span>
        <code className="font-mono text-foreground">{DEMO_PASSWORD}</code>
        <button
          type="button"
          onClick={() => onCopy(DEMO_PASSWORD, "password")}
          aria-label="Copiar contraseña"
          className="ml-auto rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {copiedField === "password" ? (
            <Check className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
