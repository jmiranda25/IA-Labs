import { useGetAdminMetrics, getGetAdminMetricsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ── KPI Dashboard ─────────────────────────────────────────────────────────────

function spark(trend: number) {
  const base = 20;
  return Array.from({ length: 8 }, (_, i) => ({
    v: Math.max(0, base + Math.round(Math.sin(i + trend) * 8 + Math.random() * 4)),
  }));
}

interface KpiCardProps {
  label: string;
  value: number | string;
  growth?: number;
  sparkData?: { v: number }[];
  color?: string;
  alert?: boolean;
  onClick?: () => void;
}

function KpiCard({ label, value, growth, sparkData, color = "#6366f1", alert, onClick }: KpiCardProps) {
  return (
    <Card
      onClick={onClick}
      className={`relative overflow-hidden transition-all ${onClick ? "cursor-pointer hover:border-primary/60" : ""} ${alert ? "border-destructive/40" : ""}`}
    >
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold tabular-nums ${alert ? "text-destructive" : ""}`}>{value}</p>
        {growth !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${growth > 0 ? "text-green-400" : growth < 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {growth > 0 ? <TrendingUp className="h-3 w-3" /> : growth < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {growth > 0 ? "+" : ""}{growth}% últimos 30 días
          </div>
        )}
        {sparkData && (
          <div className="absolute bottom-0 right-0 w-24 h-10 opacity-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Area type="monotone" dataKey="v" stroke={color} fill={color} strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard({ onDrillDown }: { onDrillDown: (tab: string) => void }) {
  const { data: metrics, isLoading } = useGetAdminMetrics({ query: { queryKey: getGetAdminMetricsQueryKey() } });
  const m = metrics as any;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
  }

  const cards = [
    { label: "Total Miembros", value: m?.totalMembers ?? 0, growth: m?.members30dGrowth, sparkData: spark(1), tab: "users" },
    { label: "Solicitudes pendientes", value: m?.pendingUsers ?? 0, sparkData: spark(7), color: "#a855f7", alert: (m?.pendingUsers ?? 0) > 0, tab: "pendientes" },
    { label: "Eventos próximos", value: m?.upcomingEvents ?? 0, sparkData: spark(2), color: "#f97316", tab: "eventos" },
    { label: "Hilos activos (7d)", value: m?.activeThreads7d ?? 0, sparkData: spark(3), color: "#22c55e", tab: null },
    { label: "Listings pendientes", value: m?.pendingListings ?? 0, sparkData: spark(4), color: "#eab308", alert: (m?.pendingListings ?? 0) > 0, tab: "moderacion" },
    { label: "Recursos pendientes", value: m?.pendingResources ?? 0, sparkData: spark(5), color: "#eab308", alert: (m?.pendingResources ?? 0) > 0, tab: "moderacion" },
    { label: "Reportes abiertos", value: m?.openReports ?? 0, sparkData: spark(6), color: "#ef4444", alert: (m?.openReports ?? 0) > 0, tab: "moderacion" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Haz clic en una tarjeta para ir a esa sección.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        {cards.map(({ label, value, growth, sparkData, color, alert, tab }) => (
          <KpiCard
            key={label}
            label={label}
            value={value}
            growth={growth}
            sparkData={sparkData}
            color={color}
            alert={alert}
            onClick={tab ? () => onDrillDown(tab) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
