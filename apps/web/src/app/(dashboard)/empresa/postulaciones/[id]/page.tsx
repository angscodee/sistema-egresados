'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { EstadoPostulacion, HistorialEstadoItem } from '@/lib/api-types';
import {
  CONTRATO_LABELS,
  ESTADO_COLORS,
  ESTADO_DOT,
  ESTADO_LABELS,
  ESTADOS_TRANSICION,
  MODALIDAD_LABELS,
} from '@/lib/postulacion-estados';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, Briefcase, Download, FileText, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const NIVEL_LABELS: Record<string, string> = {
  BASICO: 'Básico',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
  EXPERTO: 'Experto',
};

type PostulacionGestion = {
  id: string;
  estado: EstadoPostulacion;
  createdAt: Date | string;
  matchPct: number;
  oferta: {
    id: string;
    titulo: string;
    modalidad: string;
    tipoContrato: string;
    habilidades: Array<{ habilidadId: string; requerido: boolean; habilidad: { nombre: string } }>;
  };
  egresado: {
    id: string;
    nombre: string;
    apellido: string;
    carrera: string | null;
    anioEgreso: number | null;
    cvUrl: string | null;
    telefono: string | null;
    formacionAcademica: unknown;
    experienciaLaboral: unknown;
    habilidades: Array<{ habilidadId: string; nivel: string; habilidad: { nombre: string } }>;
  };
  historial: HistorialEstadoItem[];
};

type FormacionItem = { institucion?: string; titulo?: string; anioInicio?: number; anioFin?: number };
type ExperienciaItem = { empresa?: string; cargo?: string; anioInicio?: number; anioFin?: number; descripcion?: string };

export default function EmpresaPostulacionDetallePage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const [nuevoEstado, setNuevoEstado] = useState<EstadoPostulacion | ''>('');
  const [comentario, setComentario] = useState('');

  const { data: raw, isLoading, isError } = trpc.postulaciones.getPostulacionDetalle.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const data = raw as PostulacionGestion | undefined;

  const cambiarEstadoMutation = trpc.postulaciones.cambiarEstado.useMutation({
    onSuccess: () => {
      toast.success('Estado actualizado correctamente.');
      setNuevoEstado('');
      setComentario('');
      void utils.postulaciones.getPostulacionDetalle.invalidate({ id: params.id });
    },
    onError: (err) => toast.error(err.message ?? 'Error al actualizar el estado.'),
  });

  if (user?.role !== 'EMPRESA') return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/empresa/postulaciones"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
        </Button>
        <p className="text-sm text-destructive">No se pudo cargar la postulación.</p>
      </div>
    );
  }

  const ofertaHabilidadIds = new Set(data.oferta.habilidades.map((h) => h.habilidadId));
  const formacion = (data.egresado.formacionAcademica ?? []) as FormacionItem[];
  const experiencia = (data.egresado.experienciaLaboral ?? []) as ExperienciaItem[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/empresa/postulaciones"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {data.egresado.nombre} {data.egresado.apellido}
            </h1>
            <p className="text-sm text-muted-foreground">
              Postulación a: {data.oferta.titulo} ·{' '}
              {MODALIDAD_LABELS[data.oferta.modalidad] ?? data.oferta.modalidad} ·{' '}
              {CONTRATO_LABELS[data.oferta.tipoContrato] ?? data.oferta.tipoContrato}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`text-sm px-3 py-1 ${ESTADO_COLORS[data.estado]}`}>
          {ESTADO_LABELS[data.estado]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: egresado profile */}
        <div className="space-y-6 lg:col-span-2">
          {/* Personal info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4" />
                Perfil del candidato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="text-muted-foreground">Carrera: </span>
                  <span className="font-medium">{data.egresado.carrera ?? '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Año egreso: </span>
                  <span className="font-medium">{data.egresado.anioEgreso ?? '—'}</span>
                </div>
                {data.egresado.telefono && (
                  <div>
                    <span className="text-muted-foreground">Teléfono: </span>
                    <span>{data.egresado.telefono}</span>
                  </div>
                )}
              </div>

              {/* CV */}
              {data.egresado.cvUrl ? (
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="flex-1 text-sm">Currículum Vitae</span>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`${API_URL}${data.egresado.cvUrl}`} target="_blank" rel="noopener noreferrer" download>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar CV
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">Sin CV adjunto.</p>
              )}
            </CardContent>
          </Card>

          {/* Skills with match highlight */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Habilidades
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — {data.matchPct}% de coincidencia con la oferta
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.egresado.habilidades.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin habilidades registradas.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.egresado.habilidades.map((h) => {
                    const matches = ofertaHabilidadIds.has(h.habilidadId);
                    return (
                      <div
                        key={h.habilidadId}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                          matches
                            ? 'border-green-300 bg-green-50 text-green-800'
                            : 'border-muted bg-secondary text-secondary-foreground'
                        }`}
                      >
                        <span className="font-medium">{h.habilidad.nombre}</span>
                        <span className="text-xs opacity-70">· {NIVEL_LABELS[h.nivel] ?? h.nivel}</span>
                        {matches && <span className="text-xs text-green-600">✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Academic formation */}
          {formacion.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-4 w-4" />
                  Formación académica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formacion.map((f, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <p className="font-medium">{f.titulo ?? '—'}</p>
                    <p className="text-sm text-muted-foreground">{f.institucion ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.anioInicio ?? '?'} – {f.anioFin ?? 'Presente'}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Work experience */}
          {experiencia.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="h-4 w-4" />
                  Experiencia laboral
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {experiencia.map((e, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <p className="font-medium">{e.cargo ?? '—'}</p>
                    <p className="text-sm text-muted-foreground">{e.empresa ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.anioInicio ?? '?'} – {e.anioFin ?? 'Presente'}
                    </p>
                    {e.descripcion && <p className="mt-1 text-sm text-muted-foreground">{e.descripcion}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: state change + timeline */}
        <div className="space-y-6">
          {/* State change panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actualizar estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nuevo estado</Label>
                <Select
                  value={nuevoEstado}
                  onValueChange={(v) => setNuevoEstado(v as EstadoPostulacion)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_TRANSICION.filter((e) => e !== data.estado).map((e) => (
                      <SelectItem key={e} value={e}>
                        {ESTADO_LABELS[e]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comentario">Comentario (opcional)</Label>
                <textarea
                  id="comentario"
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Motivo del cambio de estado…"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={!nuevoEstado || cambiarEstadoMutation.isPending}
                onClick={() => {
                  if (!nuevoEstado) return;
                  cambiarEstadoMutation.mutate({
                    id: params.id,
                    nuevoEstado,
                    motivo: comentario.trim() || undefined,
                  });
                }}
              >
                {cambiarEstadoMutation.isPending ? 'Actualizando…' : 'Actualizar estado'}
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l border-muted pl-4">
                <li className="mb-6">
                  <div className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-background ${ESTADO_DOT['POSTULADO']}`} />
                  <p className="text-sm font-medium">Postulado</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(data.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </li>
                {data.historial.map((h) => (
                  <li key={h.id} className="mb-6">
                    <div className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-background ${ESTADO_DOT[h.estadoNuevo]}`} />
                    <p className="text-sm font-medium">{ESTADO_LABELS[h.estadoNuevo]}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {h.motivo && (
                      <p className="mt-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {h.motivo}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
