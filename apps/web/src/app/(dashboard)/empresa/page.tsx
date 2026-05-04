'use client';

import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import { BarChart3, Briefcase, LineChart as LineChartIcon, PieChart as PieChartIcon, TrendingUp, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const PIE_COLORS = ['hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)', 'hsl(173, 80%, 40%)', 'hsl(0, 84%, 60%)', 'hsl(43, 96%, 56%)'];

function endOfTodayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function thirtyDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function EmpresaDashboardPage() {
  const { user } = useAuth();
  const [range, setRange] = useState(() => ({ startDate: thirtyDaysAgoISO(), endDate: endOfTodayISO() }));
  const [applied, setApplied] = useState<{ startDate?: Date; endDate?: Date } | undefined>(undefined);

  const input = useMemo(() => {
    if (!user?.id) return undefined;
    return {
      empresaId: user.id,
      startDate: applied?.startDate,
      endDate: applied?.endDate,
    };
  }, [applied, user?.id]);

  const query = trpc.estadisticas.empresaDashboard.useQuery(input as { empresaId: string; startDate?: Date; endDate?: Date }, {
    enabled: user?.role === 'EMPRESA' && Boolean(user?.id),
  });

  if (user?.role !== 'EMPRESA') return null;

  const { data, isLoading, isFetching, isError, refetch } = query;
  const loading = isLoading || isFetching;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard de empresa</h1>
        <p className="text-muted-foreground">KPIs de captación y rendimiento de tus ofertas publicadas.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Filtro global de fechas</CardTitle>
            <CardDescription>Filtra KPIs y todas las gráficas del dashboard.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <DateRangePicker value={range} onChange={setRange} idPrefix="empresa-kpi" />
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
                  refetch();
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isError ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            No se pudieron cargar las estadísticas de la empresa.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Ofertas publicadas" value={data?.kpis.totalOfertas ?? '—'} icon={Briefcase} loading={loading} />
        <KpiCard title="Ofertas activas" value={data?.kpis.ofertasActivas ?? '—'} icon={LineChartIcon} loading={loading} />
        <KpiCard title="Postulaciones recibidas" value={data?.kpis.totalPostulaciones ?? '—'} icon={Users} loading={loading} />
        <KpiCard title="Tasa de conversión" value={data ? `${data.kpis.tasaConversion}%` : '—'} icon={TrendingUp} loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4" />
              Postulaciones por estado
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full w-full rounded-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.graficas.postulacionesPorEstado ?? []} dataKey="total" nameKey="estado" outerRadius={92} label>
                    {(data?.graficas.postulacionesPorEstado ?? []).map((_, i) => (
                      <Cell key={`p-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChartIcon className="h-4 w-4" />
              Contrataciones mensuales
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.graficas.contratacionesMensuales ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="contrataciones" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Top ofertas por postulaciones
            </CardTitle>
            <CardDescription>Top 10 ofertas con mayor tracción.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(data?.graficas.postulacionesPorOferta ?? []).map((o) => ({
                    titulo: o.titulo.length > 32 ? `${o.titulo.slice(0, 32)}…` : o.titulo,
                    Postulaciones: o.postulaciones,
                    Contratados: o.contratados,
                  }))}
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="titulo" interval={0} angle={-20} height={70} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Postulaciones" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Contratados" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
