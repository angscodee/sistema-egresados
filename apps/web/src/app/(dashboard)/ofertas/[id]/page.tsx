'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { OfertaDetail, PostulacionListItem } from '@/lib/api-types';
import { CONTRATO_LABELS, MODALIDAD_LABELS } from '@/lib/postulacion-estados';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function OfertaDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data: raw, isLoading, isError } = trpc.ofertas.findOne.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const oferta = raw as OfertaDetail | undefined;

  // Check if egresado already applied
  const { data: misPostulacionesRaw } = trpc.postulaciones.getMisPostulaciones.useQuery(undefined, {
    enabled: user?.role === 'EGRESADO',
  });

  const misPostulaciones = (misPostulacionesRaw ?? []) as PostulacionListItem[];
  const yaPostulo = misPostulaciones.some((p) => p.oferta.id === params.id);

  const postularMutation = trpc.postulaciones.postular.useMutation({
    onSuccess: () => {
      toast.success('¡Postulación enviada correctamente!');
      void utils.postulaciones.getMisPostulaciones.invalidate();
    },
    onError: (err) => toast.error(err.message ?? 'Error al postular.'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !oferta) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/ofertas"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
        </Button>
        <p className="text-sm text-destructive">No se pudo cargar la oferta.</p>
      </div>
    );
  }

  const isActiva = oferta.estado === 'ACTIVA';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/ofertas"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{oferta.titulo}</h1>
            <p className="text-sm text-muted-foreground">{oferta.empresa.nombreComercial}</p>
          </div>
        </div>

        {/* Postular button — only for EGRESADO */}
        {user?.role === 'EGRESADO' && (
          <div className="flex flex-col items-end gap-1">
            {yaPostulo ? (
              <Button disabled variant="outline" className="gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Ya postulaste
              </Button>
            ) : (
              <Button
                disabled={!isActiva || postularMutation.isLoading}
                onClick={() => postularMutation.mutate({ ofertaId: params.id })}
              >
                {postularMutation.isLoading ? 'Enviando…' : 'Postular ahora'}
              </Button>
            )}
            {!isActiva && !yaPostulo && (
              <p className="text-xs text-muted-foreground">Esta oferta ya no acepta postulaciones.</p>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Offer details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Detalles de la oferta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Meta row */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">{MODALIDAD_LABELS[oferta.modalidad] ?? oferta.modalidad}</Badge>
                <Badge variant="secondary">{CONTRATO_LABELS[oferta.tipoContrato] ?? oferta.tipoContrato}</Badge>
                <Badge variant={isActiva ? 'default' : 'secondary'}>{oferta.estado}</Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {oferta.ubicacion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {oferta.ubicacion}
                  </span>
                )}
                {(oferta.salarioMin != null || oferta.salarioMax != null) && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-foreground">
                      S/ {oferta.salarioMin ?? '—'} – {oferta.salarioMax ?? '—'}
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Publicada: {new Date(oferta.fechaPublicacion).toLocaleDateString('es-PE')}
                </span>
                {oferta.fechaCierre && (
                  <span className="flex items-center gap-1 text-orange-600">
                    <Calendar className="h-3.5 w-3.5" />
                    Cierra: {new Date(oferta.fechaCierre).toLocaleDateString('es-PE')}
                  </span>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Descripción</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{oferta.descripcion}</p>
              </div>

              {/* Required skills */}
              {oferta.habilidades.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Habilidades requeridas</p>
                  <div className="flex flex-wrap gap-2">
                    {oferta.habilidades.map((h) => (
                      <Badge
                        key={h.habilidadId}
                        variant={h.requerido ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {h.habilidad.nombre}
                        {h.requerido && <span className="ml-1 opacity-60">*</span>}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">* Obligatoria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: company info */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Sobre la empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-semibold">{oferta.empresa.nombreComercial}</p>
              <p className="text-xs text-muted-foreground">{oferta.empresa.razonSocial}</p>

              {oferta.empresa.sector && (
                <div>
                  <span className="text-muted-foreground">Sector: </span>
                  <span>{oferta.empresa.sector}</span>
                </div>
              )}

              {oferta.empresa.descripcion && (
                <p className="text-muted-foreground">{oferta.empresa.descripcion}</p>
              )}

              {oferta.empresa.sitioWeb && (
                <a
                  href={oferta.empresa.sitioWeb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Sitio web
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {/* CTA for egresado */}
              {user?.role === 'EGRESADO' && !yaPostulo && isActiva && (
                <Button
                  className="mt-2 w-full"
                  disabled={postularMutation.isLoading}
                  onClick={() => postularMutation.mutate({ ofertaId: params.id })}
                >
                  {postularMutation.isLoading ? 'Enviando…' : 'Postular ahora'}
                </Button>
              )}
              {user?.role === 'EGRESADO' && yaPostulo && (
                <div className="mt-2 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Ya te postulaste a esta oferta
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
