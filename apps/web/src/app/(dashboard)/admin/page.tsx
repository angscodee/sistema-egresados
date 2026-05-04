'use client';

import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import {
  BarChart3,
  Briefcase,
  GraduationCap,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PIE_COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(330, 81%, 60%)',
  'hsl(173, 80%, 40%)',
  'hsl(43, 96%, 56%)',
  'hsl(0, 84%, 60%)',
  'hsl(199, 89%, 48%)',
  'hsl(280, 65%, 60%)',
];

function endOfTodayISO() {
  return new Date().toISOString().slice(0, 10);
}
function thirtyDaysAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [range, setRange] = useState(() => ({
    startDate: thirtyDaysAgoISO(),
    endDate: endOfTodayISO(),
  }));
  const [applied, setApplied] = useState<{ startDate?: Date; endDate?: Date } | undefined>(
    undefined,
  );

  const input = useMemo(() => {
    if (!applied?.startDate || !applied?.endDate) return undefined;
    return { startDate: applied.startDate, endDate: applied.endDate };
  }, [applied]);

  const { data, isLoading, isFetching, refetch } = trpc.estadisticas.adminDashboard.useQuery(
    input,
    { enabled: user?.role === 'ADMIN' },
  );

  const loading = isLoading || isFetching;

  if (user?.role !== 'ADMIN') return null;

  const lineData =
    data?.graficas.ofertasVsPostulacionesMensual.map((r) => ({
      mes: r.mes,
      Ofertas: r.ofertas,
      Postulaciones: r.postulaciones,
    })) ?? [];

  const pieData =
    data?.graficas.egresadosPorCarrera.map((r) => ({ name: r.carrera, value: r.total })) ?? [];

  const barHabilidades =
    data?.graficas.topHabilidadesDemandadas.map((r) => ({
      nombre: r.nombre.length > 24 ? `${r.nombre.slice(0, 24)}…` : r.nombre,
      demanda: r.demanda,
    })) ?? [];

  const barCohortes =
    data?.graficas.tasaContratacionPorCohorte.map((r) => ({
      cohorte: r.anioEgreso ?? 'Sin año',
      Egresados: r.totalEgresados,
      Contratados: r.contratados,
    })) ?? [];

  const tooltipStyle = {
    borderRadius: 8,
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--card))',
  };

  return (
    <div className="space-y-8" data-testid="admin-dashboard">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de administración</h1>
        <p className="text-muted-foreground">Indicadores globales y tendencias del programa.</p>
      </div>

      {/* Date filter */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Filtro global de fecha</CardTitle>
            <CardDescription>Aplica a KPIs y a todas las gráficas.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <DateRangePicker value={range} onChange={setRange} idPrefix="admin-kpi" />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() =>
                  setApplied({
                    startDate: new Date(`${range.startDate}T00:00:00`),
                    endDate: new Date(`${range.endDate}T23:59:59`),
                  })
                }
              >
                Aplicar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setApplied(undefined);
                  void refetch();
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total egresados"
          value={data?.kpis.totalEgresados ?? '—'}
          subtitle="Perfiles registrados"
          icon={GraduationCap}
          loading={loading}
        />
        <KpiCard
          title="Empresas activas"
          value={data?.kpis.totalEmpresas ?? '—'}
          subtitle="Con al menos una oferta activa"
          icon={Briefcase}
          loading={loading}
        />
        <KpiCard
          title="Ofertas activas"
          value={data?.kpis.ofertasActivas ?? '—'}
          subtitle="Vacantes publicadas"
          icon={LineChartIcon}
          loading={loading}
        />
        <KpiCard
          title="Tasa empleabilidad"
          value={data ? `${data.kpis.tasaEmpleabilidad}%` : '—'}
          subtitle="Egresados contratados / total"
          icon={TrendingUp}
          loading={loading}
        />
      </div>

      {/* Charts in Tabs */}
      <Tabs defaultValue="tendencia" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="tendencia" className="gap-1.5">
            <LineChartIcon className="h-3.5 w-3.5" />
            Tendencia mensual
          </TabsTrigger>
          <TabsTrigger value="carreras" className="gap-1.5">
            <PieChartIcon className="h-3.5 w-3.5" />
            Por carrera
          </TabsTrigger>
          <TabsTrigger value="habilidades" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Habilidades
          </TabsTrigger>
          <TabsTrigger value="cohortes" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Cohortes
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Ofertas vs Postulaciones */}
        <TabsContent value="tendencia">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChartIcon className="h-4 w-4" />
                Ofertas vs postulaciones — últimos 12 meses
              </CardTitle>
              <CardDescription>Evolución mensual de publicaciones y candidaturas.</CardDescription>
            </CardHeader>
            <CardContent className="h-[340px]">
              {loading ? (
                <Skeleton className="h-full w-full" data-testid="chart-skeleton" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Ofertas"
                      stroke="hsl(221, 83%, 53%)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Postulaciones"
                      stroke="hsl(262, 83%, 58%)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Egresados por carrera */}
        <TabsContent value="carreras">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChartIcon className="h-4 w-4" />
                Egresados por carrera
              </CardTitle>
              <CardDescription>Distribución de perfiles registrados.</CardDescription>
            </CardHeader>
            <CardContent className="h-[340px]">
              {loading ? (
                <Skeleton className="h-full w-full rounded-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ name, percent }) =>
                        `${String(name)} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {pieData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Top habilidades */}
        <TabsContent value="habilidades">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Top 10 habilidades demandadas
              </CardTitle>
              <CardDescription>En ofertas activas del periodo seleccionado.</CardDescription>
            </CardHeader>
            <CardContent className="h-[340px]">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barHabilidades} layout="vertical" margin={{ left: 16, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      width={130}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="demanda" fill="hsl(221, 83%, 53%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Cohortes */}
        <TabsContent value="cohortes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Tasa de contratación por cohorte
              </CardTitle>
              <CardDescription>
                Egresados vs contratados por año de egreso.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[340px]">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barCohortes} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="cohorte" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar
                      dataKey="Egresados"
                      fill="hsl(221, 83%, 53%)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Contratados"
                      fill="hsl(262, 83%, 58%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
