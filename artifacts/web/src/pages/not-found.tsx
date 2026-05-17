import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground px-4 text-center gap-6">
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-primary" aria-hidden="true" />
        <span className="font-bold text-lg tracking-tight">IA Labs</span>
      </div>

      <div className="space-y-3">
        <p
          className="text-8xl font-black tabular-nums leading-none select-none"
          style={{ color: "hsl(var(--primary) / 0.15)" }}
          aria-hidden="true"
        >
          404
        </p>
        <h1 className="text-2xl font-bold">Página no encontrada</h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
          La página que buscas no existe o fue movida. Verifica la URL o regresa al inicio.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/">
          <Button size="lg" className="min-h-[44px] min-w-[140px]">
            Ir al inicio
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button size="lg" variant="outline" className="min-h-[44px] min-w-[140px]">
            Mi dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
