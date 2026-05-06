'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { EstadoValidacion } from '@/lib/api-types';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const ESTADO_BADGE: Record<EstadoValidacion, { label: string; className: string }> = {
  PENDIENTE: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  APROBADA: { label: 'Aprobada', className: 'bg-green-100 text-green-800 border-green-200' },
  RECHAZADA: { label: 'Rechazada', className: 'bg-red-100 text-red-800 border-red-200' },
};

const ESTADO_OFERTA_BADGE: Record<string, string> = {
  ACTIVA: 'bg-green-100 text-green-800 border-green-200',
  CERRADA: 'bg-gray-100 text-gray-700 border-gray-200',
  EN_REVISION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const MODALIDAD_LABELS: Record<string, string> = {
  REMOTO: 'Remoto',
  HIBRIDO: 'Híbrido',
  PRESENCIAL: 'Presencial',
};

const CONTRATO_LABELS: Record<string, string> = {
  TIEMPO_COMPLETO: 'Tiempo completo',
  MEDIO_TIEMPO: 'Medio tiempo',
  POR_PROYECTO: 'Por proyecto',
  PRACTICAS: 'Prácticas',
};

export default function AdminEmpresaDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const utils = trpc.useUtils();

  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [motivo, setMotivo] = useState('');

  const { data, isLoading, isError } = trpc.empresas.findOne.useQuery(
    { id },
    { enabled: !!id },
  );

  const validarMutation = trpc.empresas.validar.useMutation({
    onSuccess: () => {
      toast.success('Empresa aprobada.');
      void utils.empresas.findOne.invalidate({ id });
    },
    onError: (err) => toast.error(err.message ?? 'Error al aprobar.'),
  });

  const rechazarMutation = trpc.empresas.rechazar.useMutation({
    onSuccess: () => {
      toast.success('Empresa rechazada.');
      setRechazarOpen(false);
      setMotivo('');
      void utils.empresas.findOne.invalidate({ id });
    },
    onError: (err) => toast.error(err.message ?? 'Error al rechazar.'),
  });

  if (user?.role !== 'ADMIN') return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/empresas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <p className="text-sm text-destructive">No se pudo cargar el perfil de la empresa.</p>
      </div>
    );
  }

  const estadoBadge = ESTADO_BADGE[data.estadoValidacion as EstadoValidacion] ?? ESTADO_BADGE.PENDIENTE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/empresas">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{data.nombreComercial}</h1>
              <Badge variant="outline" className={estadoBadge.className}>
                {estadoBadge.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {data.razonSocial} · RUC {data.ruc}
            </p>
          </div>
        </div>

        {data.estadoValidacion === 'PENDIENTE' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              disabled={validarMutation.isPending}
              onClick={() => validarMutation.mutate({ id })}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setMotivo('');
                setRechazarOpen(true);
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Company info */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Información de la empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {data.sector && (
                <div>
                  <span className="text-muted-foreground">Sector: </span>
                  <span>{data.sector}</span>
                </div>
              )}
              {data.sitioWeb && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={data.sitioWeb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {data.sitioWeb}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {data.descripcion && (
                <p className="text-muted-foreground">{data.descripcion}</p>
              )}
              {data.estadoValidacion === 'RECHAZADA' && data.motivoRechazo && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-medium text-red-700">Motivo de rechazo:</p>
                  <p className="mt-1 text-sm text-red-600">{data.motivoRechazo}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Offers */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Ofertas publicadas
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {data.ofertas.length} oferta{data.ofertas.length !== 1 ? 's' : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.ofertas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Esta empresa no ha publicado ofertas.</p>
              ) : (
                <div className="space-y-3">
                  {data.ofertas.map((o) => (
                    <div key={o.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{o.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {MODALIDAD_LABELS[o.modalidad] ?? o.modalidad} ·{' '}
                            {CONTRATO_LABELS[o.tipoContrato] ?? o.tipoContrato}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Publicada: {new Date(o.fechaPublicacion).toLocaleDateString('es-PE')} ·{' '}
                            {(o as { _count?: { postulaciones?: number } })._count?.postulaciones ?? 0} postulaciones
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={ESTADO_OFERTA_BADGE[o.estado] ?? ''}
                        >
                          {o.estado}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject modal */}
      <Dialog open={rechazarOpen} onOpenChange={(open) => { if (!open) { setRechazarOpen(false); setMotivo(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar empresa</DialogTitle>
            <DialogDescription>
              Indica el motivo de rechazo para{' '}
              <span className="font-semibold">{data.nombreComercial}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-detail">Motivo</Label>
            <textarea
              id="motivo-detail"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={4}
              placeholder="Describe el motivo del rechazo…"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRechazarOpen(false); setMotivo(''); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!motivo.trim() || rechazarMutation.isPending}
              onClick={() => {
                if (motivo.trim()) {
                  rechazarMutation.mutate({ id, motivo: motivo.trim() });
                }
              }}
            >
              {rechazarMutation.isPending ? 'Rechazando…' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
