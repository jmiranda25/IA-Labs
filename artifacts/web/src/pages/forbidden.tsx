import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Lock, Zap } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground px-4 text-center gap-6">
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-primary" aria-hidden="true" />
        <span className="font-bold text-lg tracking-tight">IA Labs</span>
      </div>

      <div className="rounded-full bg-destructive/10 p-4">
        <Lock className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>

      <div className="space-y-3">
        <p
          className="text-7xl font-black tabular-nums leading-none select-none"
          style={{ color: "hsl(var(--destructive) / 0.15)" }}
          aria-hidden="true"
        >
          403
        </p>
        <h1 className="text-2xl font-bold">Acceso restringido</h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
          No tienes permisos para ver esta página. Si crees que es un error, contacta a un administrador.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/dashboard">
          <Button size="lg" className="min-h-[44px] min-w-[140px]">
            Ir al dashboard
          </Button>
        </Link>
        <Link href="/">
          <Button size="lg" variant="outline" className="min-h-[44px] min-w-[140px]">
            Inicio
          </Button>
        </Link>
      </div>
    </div>
  );
}
