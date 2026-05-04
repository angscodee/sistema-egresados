'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { EstadoPostulacion, HistorialEstadoItem } from '@/lib/api-types';
import {
  CONTRATO_LABELS,
  ESTADO_COLORS,
  ESTADO_DOT,
  ESTADO_LABELS,
  MODALIDAD_LABELS,
} from '@/lib/postulacion-estados';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, Briefcase, Building2, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type PostulacionDetalle = {
  id: string;
  estado: EstadoPostulacion;
  createdAt: Date | string;
  comentario: string | null;
  matchPct: number;
  oferta: {
    id: string;
    titulo: string;
    descripcion: string;
    ubicacion: string | null;
    modalidad: string;
    tipoContrato: string;
    salarioMin: number | null;
    salarioMax: number | null;
    empresa: {
      id: string;
      nombreComercial: string;
      sector: string | null;
      sitioWeb: string | null;
      descripcion: string | null;
      logoUrl: string | null;
    };
    habilidades: Array<{
      habilidadId: string;
      requerido: boolean;
      habilidad: { nombre: string; tipo: string };
    }>;
  };
  historial: HistorialEstadoItem[];
};

export default function PostulacionDetallePage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();

  const { data: raw, isLoading, isError } = trpc.postulaciones.getPostulacionDetalle.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const data = raw as PostulacionDetalle | undefined;

  if (user?.role !== 'EGRESADO') return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/egresado/postulaciones"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
        </Button>
        <p className="text-sm text-destructive">No se pudo cargar la postulación.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/egresado/postulaciones"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{data.oferta.titulo}</h1>
            <p className="text-sm text-muted-foreground">{data.oferta.empresa.nombreComercial}</p>
          </div>
        </div>
        <Badge variant="outline" className={`text-sm px-3 py-1 ${ESTADO_COLORS[data.estado]}`}>
          {ESTADO_LABELS[data.estado]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: offer info */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Información de la oferta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {data.oferta.ubicacion ?? 'Sin ubicación'}
                </span>
                <span>·</span>
                <span>{MODALIDAD_LABELS[data.oferta.modalidad] ?? data.oferta.modalidad}</span>
                <span>·</span>
                <span>{CONTRATO_LABELS[data.oferta.tipoContrato] ?? data.oferta.tipoContrato}</span>
                {(data.oferta.salarioMin != null || data.oferta.salarioMax != null) && (
                  <>
                    <span>·</span>
                    <span>
                      S/ {data.oferta.salarioMin ?? '—'} – {data.oferta.salarioMax ?? '—'}
                    </span>
                  </>
                )}
              </div>

              <div>
                <p className="mb-1 text-sm font-medium">Descripción</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{data.oferta.descripcion}</p>
              </div>

              {data.oferta.habilidades.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Habilidades requeridas</p>
                  <div className="flex flex-wrap gap-2">
                    {data.oferta.habilidades.map((h) => (
                      <Badge
                        key={h.habilidadId}
                        variant={h.requerido ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {h.habilidad.nombre}
                        {h.requerido && <span className="ml-1 opacity-70">*</span>}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">* Requerida</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Company info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{data.oferta.empresa.nombreComercial}</p>
              {data.oferta.empresa.sector && (
                <p className="text-muted-foreground">Sector: {data.oferta.empresa.sector}</p>
              )}
              {data.oferta.empresa.descripcion && (
                <p className="text-muted-foreground">{data.oferta.empresa.descripcion}</p>
              )}
              {data.oferta.empresa.sitioWeb && (
                <a
                  href={data.oferta.empresa.sitioWeb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {data.oferta.empresa.sitioWeb}
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: timeline */}
        <div className="space-y-6">
          {/* Match */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compatibilidad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={data.matchPct >= 70 ? 'hsl(142, 76%, 36%)' : data.matchPct >= 40 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)'}
                      strokeWidth="3"
                      strokeDasharray={`${data.matchPct} ${100 - data.matchPct}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                    {data.matchPct}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {data.matchPct >= 70
                    ? 'Excelente coincidencia con las habilidades requeridas.'
                    : data.matchPct >= 40
                      ? 'Coincidencia parcial. Considera mejorar tus habilidades.'
                      : 'Baja coincidencia con los requisitos de la oferta.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de estados</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l border-muted pl-4">
                {/* Initial postulation */}
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
