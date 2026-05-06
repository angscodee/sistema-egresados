'use client';

import { DateRangePicker, type DateRangeValue } from '@/components/dashboard/DateRangePicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReporteListItem } from '@/lib/api-types';
import { getApiUrl } from '@/lib/api-url';
import { trpc } from '@/lib/trpc/client';
import { Download, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type ReportTypeId =
  | 'ofertas_activas'
  | 'demanda_laboral'
  | 'postulaciones_periodo'
  | 'egresados_carrera'
  | 'empleabilidad_resumen'
  | 'comparativo_cohortes';

type ReportDef = {
  id: ReportTypeId;
  label: string;
  description: string;
  categoria: 'operacionales' | 'gestion';
};

const REPORT_TYPES: ReportDef[] = [
  {
    id: 'ofertas_activas',
    label: 'Ofertas activas',
    description: 'Vacantes vigentes y distribución por modalidad.',
    categoria: 'operacionales',
  },
  {
    id: 'demanda_laboral',
    label: 'Demanda laboral',
    description: 'Panorama de oferta activa y modalidades (marco analítico).',
    categoria: 'operacionales',
  },
  {
    id: 'postulaciones_periodo',
    label: 'Postulaciones por periodo',
    description: 'Movimientos de postulación en el rango de fechas indicado.',
    categoria: 'operacionales',
  },
  {
    id: 'egresados_carrera',
    label: 'Egresados por carrera',
    description: 'Directorio filtrado por carrera y cohorte.',
    categoria: 'gestion',
  },
  {
    id: 'empleabilidad_resumen',
    label: 'Resumen de empleabilidad',
    description: 'Indicadores globales, cohortes y habilidades demandadas.',
    categoria: 'gestion',
  },
  {
    id: 'comparativo_cohortes',
    label: 'Comparativo de cohortes',
    description: 'Egresados vs contratados por año de egreso.',
    categoria: 'gestion',
  },
];

function endOfTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function estadoLabel(estado: string) {
  switch (estado) {
    case 'PENDIENTE':
      return 'Pendiente';
    case 'PROCESANDO':
      return 'Procesando';
    case 'COMPLETADO':
      return 'Listo';
    case 'FALLIDO':
      return 'Fallido';
    default:
      return estado;
  }
}

function badgeVariantForEstado(estado: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (estado) {
    case 'COMPLETADO':
      return 'default';
    case 'FALLIDO':
      return 'destructive';
    case 'PROCESANDO':
      return 'secondary';
    default:
      return 'outline';
  }
}

export default function ReportesPage() {
  const [tipo, setTipo] = useState<ReportTypeId>('ofertas_activas');
  const [carrera, setCarrera] = useState('');
  const [anioEgreso, setAnioEgreso] = useState('');
  const [sector, setSector] = useState('');
  const [postulacionesRange, setPostulacionesRange] = useState<DateRangeValue>(() => ({
    startDate: thirtyDaysAgoISO(),
    endDate: endOfTodayISO(),
  }));

  const def = useMemo(() => REPORT_TYPES.find((r) => r.id === tipo)!, [tipo]);

  const prevEstadosRef = useRef<Map<string, string>>(new Map());
  const seededRef = useRef(false);
  const [hayPendientes, setHayPendientes] = useState(false);

  const listQuery = trpc.reportes.getHistorialReportes.useQuery(undefined, {
    refetchInterval: hayPendientes ? 3000 : false,
  });

  const reportesRows: ReporteListItem[] = useMemo(
    () => (listQuery.data ?? []) as ReporteListItem[],
    [listQuery.data],
  );

  // Controlar el polling según si hay reportes pendientes
  useEffect(() => {
    const rows = (listQuery.data ?? []) as ReporteListItem[];
    setHayPendientes(rows.some((r) => r.estado === 'PENDIENTE' || r.estado === 'PROCESANDO'));
  }, [listQuery.data]);

  useEffect(() => {
    if (!listQuery.data) return;
    if (!seededRef.current) {
      for (const r of listQuery.data) {
        prevEstadosRef.current.set(r.id, r.estado);
      }
      seededRef.current = true;
      return;
    }
    for (const r of listQuery.data) {
      const prev = prevEstadosRef.current.get(r.id);
      if (prev !== undefined && prev !== 'COMPLETADO' && r.estado === 'COMPLETADO') {
        toast.success('Reporte listo', { description: r.nombreArchivo });
      }
      prevEstadosRef.current.set(r.id, r.estado);
    }
  }, [listQuery.data]);

  const utils = trpc.useUtils();
  const generar = trpc.reportes.generateReport.useMutation({
    onSuccess: () => {
      void utils.reportes.getHistorialReportes.invalidate();
    },
  });

  const buildParametros = (): Record<string, string> => {
    const p: Record<string, string> = { tipoReporte: tipo };
    if (tipo === 'egresados_carrera') {
      if (carrera.trim()) p.carrera = carrera.trim();
      if (anioEgreso.trim()) p.anioEgreso = anioEgreso.trim();
    }
    if ((tipo === 'ofertas_activas' || tipo === 'demanda_laboral') && sector.trim()) {
      p.sector = sector.trim();
    }
    if (tipo === 'postulaciones_periodo') {
      p.desde = postulacionesRange.startDate;
      p.hasta = postulacionesRange.endDate;
    }
    return p;
  };

  const onGenerar = async () => {
    await generar.mutateAsync({
      tipo,
      parametros: buildParametros(),
    });
  };

  const resolveDownloadUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${getApiUrl().replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes PDF</h1>
        <p className="text-muted-foreground">Genere informes operativos o de gestión y supervise el historial en tiempo real.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card className="min-h-[420px]">
          <CardHeader>
            <CardTitle className="text-base">Generar reporte</CardTitle>
            <CardDescription>Seleccione tipo, ajuste filtros y encole la generación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tipo-reporte">Tipo de reporte</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as ReportTypeId)}>
                <SelectTrigger id="tipo-reporte" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Operacionales</SelectLabel>
                    {REPORT_TYPES.filter((r) => r.categoria === 'operacionales').map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Gestión</SelectLabel>
                    {REPORT_TYPES.filter((r) => r.categoria === 'gestion').map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{def.description}</p>
            </div>

            {tipo === 'egresados_carrera' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rep-carrera">Carrera (opcional)</Label>
                  <Input
                    id="rep-carrera"
                    value={carrera}
                    onChange={(e) => setCarrera(e.target.value)}
                    placeholder="Filtrar por carrera"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rep-anio">Año de egreso (opcional)</Label>
                  <Input
                    id="rep-anio"
                    type="number"
                    value={anioEgreso}
                    onChange={(e) => setAnioEgreso(e.target.value)}
                    placeholder="2024"
                  />
                </div>
              </div>
            ) : null}

            {(tipo === 'ofertas_activas' || tipo === 'demanda_laboral') ? (
              <div className="max-w-md space-y-2">
                <Label htmlFor="rep-sector">Sector (opcional)</Label>
                <Input
                  id="rep-sector"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="Ej. Tecnología"
                />
              </div>
            ) : null}

            {tipo === 'postulaciones_periodo' ? (
              <div className="space-y-2">
                <Label>Periodo</Label>
                <DateRangePicker value={postulacionesRange} onChange={setPostulacionesRange} idPrefix="rep-post" />
              </div>
            ) : null}

            {tipo === 'empleabilidad_resumen' || tipo === 'comparativo_cohortes' ? (
              <p className="text-sm text-muted-foreground">
                Este informe consolida datos globales de la plataforma. No requiere filtros adicionales.
              </p>
            ) : null}

            <Button type="button" onClick={() => void onGenerar()} disabled={generar.isPending}>
              {generar.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Generando…
                </>
              ) : (
                'Generar PDF'
              )}
            </Button>
            {generar.isError ? (
              <p className="text-sm text-destructive">No se pudo crear el reporte. Intente de nuevo.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-h-[420px]">
          <CardHeader>
            <CardTitle className="text-base">Historial</CardTitle>
            <CardDescription>Últimos 10 reportes. El estado se actualiza automáticamente cada 3 s si hay trabajos pendientes.</CardDescription>
          </CardHeader>
          <CardContent>
            {listQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="max-h-[min(520px,70vh)] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportesRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="max-w-[180px] truncate font-medium">{r.nombreArchivo}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.tipo}</TableCell>
                        <TableCell>
                          <Badge variant={badgeVariantForEstado(r.estado)}>{estadoLabel(r.estado)}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString('es')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={r.estado !== 'COMPLETADO' || !r.urlArchivo}
                            onClick={() => {
                              const href = resolveDownloadUrl(r.urlArchivo);
                              if (href) window.open(href, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            <Download className="mr-1 h-4 w-4" aria-hidden />
                            Descargar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {listQuery.isSuccess && reportesRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay reportes generados.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
