import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PendientePage() {
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">Solicitud enviada</h1>
          <p className="text-muted-foreground leading-relaxed">
            Revisaremos tu solicitud y te notificaremos por correo electrónico.
            Esto puede tomar hasta 24 horas.
          </p>
        </div>

        <div className="pt-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full sm:w-auto"
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
