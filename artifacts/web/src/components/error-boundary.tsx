import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack?.slice(0, 200));
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-5">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">Algo salió mal</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ocurrió un error inesperado. Puedes reintentar o regresar al inicio.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={this.reset} className="min-h-[44px]">
              Reintentar
            </Button>
            <Button
              onClick={() => { window.location.href = "/"; }}
              className="min-h-[44px]"
            >
              Ir al inicio
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
