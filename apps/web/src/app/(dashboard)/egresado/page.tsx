'use client';

import { KpiCard } from '@/components/dashboard/KpiCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import { BarChart3, Briefcase, CheckCircle2, Clock3, LineChart as LineChartIcon, PieChart as PieChartIcon, Send } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PIE_COLORS = ['hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)', 'hsl(173, 80%, 40%)', 'hsl(0, 84%, 60%)', 'hsl(43, 96%, 56%)'];

export default function EgresadoDashboardPage() {
  const { user } = useAuth();
  const query = trpc.estadisticas.egresadoDashboard.useQuery(
    { egresadoId: user?.id ?? '' },
    { enabled: user?.role === 'EGRESADO' && Boolean(user?.id) },
  );

  if (user?.role !== 'EGRESADO') return null;

  const { data, isLoading, isFetching, isError } = query;
  const loading = isLoading || isFetching;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi dashboard</h1>
        <p className="text-muted-foreground">Seguimiento de tus postulaciones y recomendaciones por habilidades.</p>
      </div>

      {isError ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            No se pudieron cargar tus estadísticas. Vuelve a intentarlo.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Postulaciones totales" value={data?.kpis.totalPostulaciones ?? '—'} icon={Send} loading={loading} />
        <KpiCard title="En revisión" value={data?.kpis.enRevision ?? '—'} icon={Clock3} loading={loading} />
        <KpiCard title="Entrevistas" value={data?.kpis.entrevistas ?? '—'} icon={Briefcase} loading={loading} />
        <KpiCard title="Contratadas" value={data?.kpis.contratadas ?? '—'} icon={CheckCircle2} loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LineChartIcon className="h-4 w-4" />
              Evolución mensual de postulaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.graficas.postulacionesMensuales ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="postulaciones" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

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
                  <Pie
                    data={data?.graficas.postulacionesPorEstado ?? []}
                    dataKey="total"
                    nameKey="estado"
                    outerRadius={90}
                    label={({ name, percent }) => `${String(name)} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  >
                    {(data?.graficas.postulacionesPorEstado ?? []).map((_, i) => (
                      <Cell key={`state-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
              <BarChart3 className="h-4 w-4" />
              Top recomendaciones por match
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(data?.graficas.topHabilidadesMatch ?? []).map((r) => ({
                    titulo: r.titulo.length > 26 ? `${r.titulo.slice(0, 26)}…` : r.titulo,
                    match: r.matchPct,
                  }))}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="titulo" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="match" fill="hsl(262, 83%, 58%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ofertas recomendadas</CardTitle>
          <CardDescription>Ordenadas por porcentaje de coincidencia con tus habilidades.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : (
            (data?.recomendaciones ?? []).slice(0, 8).map((item) => (
              <div key={item.ofertaId} className="rounded-md border p-3">
                <p className="font-medium">{item.titulo}</p>
                <p className="text-sm text-muted-foreground">
                  {item.empresaNombre} · Match {item.matchPct}%
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
