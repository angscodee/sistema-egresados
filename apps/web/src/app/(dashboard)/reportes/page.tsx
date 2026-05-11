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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { trpc } from '@/lib/trpc/client';
import { FileText, Loader2, Printer } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

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
  { id: 'ofertas_activas', label: 'Ofertas activas', description: 'Vacantes vigentes y distribución por modalidad.', categoria: 'operacionales' },
  { id: 'demanda_laboral', label: 'Demanda laboral', description: 'Panorama de oferta activa y modalidades.', categoria: 'operacionales' },
  { id: 'postulaciones_periodo', label: 'Postulaciones por periodo', description: 'Movimientos de postulación en el rango de fechas indicado.', categoria: 'operacionales' },
  { id: 'egresados_carrera', label: 'Egresados por carrera', description: 'Directorio filtrado por carrera y cohorte.', categoria: 'gestion' },
  { id: 'empleabilidad_resumen', label: 'Resumen de empleabilidad', description: 'Indicadores globales, cohortes y habilidades demandadas.', categoria: 'gestion' },
  { id: 'comparativo_cohortes', label: 'Comparativo de cohortes', description: 'Egresados vs contratados por año de egreso.', categoria: 'gestion' },
];

function endOfTodayISO() { return new Date().toISOString().slice(0, 10); }
function thirtyDaysAgoISO() { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); }

// ─── Report preview renderers ─────────────────────────────────────────────────

function KpiGrid({ kpis }: { kpis: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6 print:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.label} className="rounded-lg border bg-muted/40 p-3 text-center">
          <p className="text-2xl font-bold">{k.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
        </div>
      ))}
    </div>
  );
}

function ReportPreview({ tipo, data, generatedAt }: { tipo: string; data: unknown; generatedAt: string }) {
  const d = data as Record<string, unknown>;
  const date = new Date(generatedAt).toLocaleString('es');
  const def = REPORT_TYPES.find((r) => r.id === tipo);

  return (
    <div className="space-y-4">
      <div className="border-b pb-3">
        <h2 className="text-lg font-bold">{def?.label ?? tipo}</h2>
        <p className="text-xs text-muted-foreground">Generado: {date}</p>
      </div>

      {/* KPIs */}
      {Array.isArray(d.kpis) && <KpiGrid kpis={d.kpis as { label: string; value: string }[]} />}

      {/* Ofertas rows */}
      {Array.isArray(d.ofertasRows) && (d.ofertasRows as unknown[]).length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 text-sm">Listado de ofertas</h3>
          <div className="overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Salario</TableHead>
                  <TableHead>Publicada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(d.ofertasRows as Record<string, string>[]).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.titulo}</TableCell>
                    <TableCell>{r.empresa}</TableCell>
                    <TableCell>{r.modalidad}</TableCell>
                    <TableCell>{r.salario}</TableCell>
                    <TableCell>{r.publicada}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Modalidad rows */}
      {Array.isArray(d.modalidadRows) && (d.modalidadRows as unknown[]).length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 text-sm">Por modalidad</h3>
          <div className="overflow-auto rounded border">
            <Table>
              <TableHeader><TableRow><TableHead>Modalidad</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {(d.modalidadRows as Record<string, unknown>[]).map((r, i) => (
                  <TableRow key={i}><TableCell>{String(r.modalidad)}</TableCell><TableCell>{String(r.total)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Egresados rows */}
      {Array.isArray(d.rows) && (d.rows as unknown[]).length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 text-sm">
            {tipo === 'postulaciones_periodo' ? 'Postulaciones' : tipo === 'comparativo_cohortes' ? 'Cohortes' : 'Egresados'}
          </h3>
          <div className="overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys((d.rows as Record<string, unknown>[])[0]).map((k) => (
                    <TableHead key={k} className="capitalize">{k}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(d.rows as Record<string, unknown>[]).map((r, i) => (
                  <TableRow key={i}>
                    {Object.values(r).map((v, j) => (
                      <TableCell key={j}>{String(v ?? '—')}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Cohort rows */}
      {Array.isArray(d.cohortRows) && (d.cohortRows as unknown[]).length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 text-sm">Por cohorte</h3>
          <div className="overflow-auto rounded border">
            <Table>
              <TableHeader><TableRow><TableHead>Año</TableHead><TableHead>Egresados</TableHead><TableHead>Contratados</TableHead><TableHead>Tasa %</TableHead></TableRow></TableHeader>
              <TableBody>
                {(d.cohortRows as Record<string, unknown>[]).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{String(r.anio)}</TableCell>
                    <TableCell>{String(r.egresados)}</TableCell>
                    <TableCell>{String(r.contratados)}</TableCell>
                    <TableCell>{String(r.tasa)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Top skills */}
      {Array.isArray(d.topSkills) && (d.topSkills as unknown[]).length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 text-sm">Habilidades más demandadas</h3>
          <div className="overflow-auto rounded border">
            <Table>
              <TableHeader><TableRow><TableHead>Habilidad</TableHead><TableHead>Tipo</TableHead><TableHead>Demanda</TableHead></TableRow></TableHeader>
              <TableBody>
                {(d.topSkills as Record<string, unknown>[]).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{String(r.nombre)}</TableCell>
                    <TableCell>{String(r.tipo)}</TableCell>
                    <TableCell>{String(r.demanda)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Periodo label */}
      {typeof d.periodoLabel === 'string' && (
        <p className="text-sm text-muted-foreground">{d.periodoLabel}</p>
      )}

      {/* Filtros */}
      {typeof d.filtroCarrera === 'string' && (
        <p className="text-sm text-muted-foreground">Carrera: {d.filtroCarrera}{d.filtroAnio ? ` · Año: ${String(d.filtroAnio)}` : ''}</p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const [tipo, setTipo] = useState<ReportTypeId>('ofertas_activas');
  const [carrera, setCarrera] = useState('');
  const [anioEgreso, setAnioEgreso] = useState('');
  const [sector, setSector] = useState('');
  const [postulacionesRange, setPostulacionesRange] = useState<DateRangeValue>(() => ({
    startDate: thirtyDaysAgoISO(),
    endDate: endOfTodayISO(),
  }));
  const [enabled, setEnabled] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const def = useMemo(() => REPORT_TYPES.find((r) => r.id === tipo)!, [tipo]);

  const buildParametros = (): Record<string, string> => {
    const p: Record<string, string> = {};
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

  const [parametros, setParametros] = useState<Record<string, string>>({});

  const reportQuery = trpc.reportes.getReportData.useQuery(
    { tipo, parametros },
    { enabled, staleTime: 0 },
  );

  const onVerReporte = () => {
    setParametros(buildParametros());
    setEnabled(true);
  };

  const onImprimir = () => {
    window.print();
  };

  // Reset when tipo changes
  const handleTipoChange = (v: string) => {
    setTipo(v as ReportTypeId);
    setEnabled(false);
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#print-area) { display: none !important; }
          #print-area { display: block !important; padding: 2rem; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">Genere informes operativos o de gestión y visualícelos en pantalla.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configurar reporte</CardTitle>
            <CardDescription>Seleccione tipo, ajuste filtros y visualice el resultado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 max-w-sm">
              <Label htmlFor="tipo-reporte">Tipo de reporte</Label>
              <Select value={tipo} onValueChange={handleTipoChange}>
                <SelectTrigger id="tipo-reporte">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Operacionales</SelectLabel>
                    {REPORT_TYPES.filter((r) => r.categoria === 'operacionales').map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Gestión</SelectLabel>
                    {REPORT_TYPES.filter((r) => r.categoria === 'gestion').map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{def.description}</p>
            </div>

            {tipo === 'egresados_carrera' && (
              <div className="grid gap-4 sm:grid-cols-2 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="rep-carrera">Carrera (opcional)</Label>
                  <Input id="rep-carrera" value={carrera} onChange={(e) => setCarrera(e.target.value)} placeholder="Filtrar por carrera" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rep-anio">Año de egreso (opcional)</Label>
                  <Input id="rep-anio" type="number" value={anioEgreso} onChange={(e) => setAnioEgreso(e.target.value)} placeholder="2024" />
                </div>
              </div>
            )}

            {(tipo === 'ofertas_activas' || tipo === 'demanda_laboral') && (
              <div className="max-w-xs space-y-2">
                <Label htmlFor="rep-sector">Sector (opcional)</Label>
                <Input id="rep-sector" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Ej. Tecnología" />
              </div>
            )}

            {tipo === 'postulaciones_periodo' && (
              <div className="max-w-sm space-y-2">
                <Label>Periodo</Label>
                <DateRangePicker value={postulacionesRange} onChange={setPostulacionesRange} idPrefix="rep-post" />
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button type="button" onClick={onVerReporte} disabled={reportQuery.isFetching}>
                {reportQuery.isFetching ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cargando…</>
                ) : (
                  <><FileText className="h-4 w-4 mr-2" />Ver reporte</>
                )}
              </Button>
              {reportQuery.isSuccess && (
                <Button type="button" variant="outline" onClick={onImprimir}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir / Guardar PDF
                </Button>
              )}
            </div>

            {reportQuery.isError && (
              <p className="text-sm text-destructive">No se pudo cargar el reporte. Intente de nuevo.</p>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {reportQuery.isSuccess && reportQuery.data && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Vista previa</CardTitle>
                <Badge variant="secondary">
                  {REPORT_TYPES.find((r) => r.id === tipo)?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={printRef}>
                <ReportPreview
                  tipo={reportQuery.data.tipo}
                  data={reportQuery.data.data}
                  generatedAt={reportQuery.data.generatedAt}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Print area — hidden on screen, visible when printing */}
      <div id="print-area" style={{ display: 'none' }}>
        {reportQuery.isSuccess && reportQuery.data && (
          <ReportPreview
            tipo={reportQuery.data.tipo}
            data={reportQuery.data.data}
            generatedAt={reportQuery.data.generatedAt}
          />
        )}
      </div>
    </>
  );
}
