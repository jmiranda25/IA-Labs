import { useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RechazadoPage() {
  const { signOut } = useClerk();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">Solicitud no aprobada</h1>
          <p className="text-muted-foreground leading-relaxed">
            Tu solicitud no fue aprobada. Si crees que es un error, escríbenos a{" "}
            <a
              href="mailto:hola@aibuild.community"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              hola@aibuild.community
            </a>
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate("/")}
            className="w-full sm:w-auto"
          >
            Reintentar acceso
          </Button>
          <Button
            variant="outline"
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full sm:w-auto"
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
