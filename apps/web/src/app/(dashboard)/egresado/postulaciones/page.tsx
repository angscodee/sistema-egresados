'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PostulacionListItem } from '@/lib/api-types';
import { ESTADO_COLORS, ESTADO_LABELS, MODALIDAD_LABELS } from '@/lib/postulacion-estados';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import { Eye } from 'lucide-react';
import Link from 'next/link';

export default function MisPostulacionesPage() {
  const { user } = useAuth();

  const { data: rawData, isLoading } = trpc.postulaciones.getMisPostulaciones.useQuery(undefined, {
    enabled: user?.role === 'EGRESADO',
  });

  const items = (rawData ?? []) as PostulacionListItem[];

  if (user?.role !== 'EGRESADO') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mis postulaciones</h1>
        <p className="text-muted-foreground">Seguimiento de todas tus postulaciones activas e históricas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isLoading ? '…' : `${items.length} postulación${items.length !== 1 ? 'es' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Aún no te has postulado a ninguna oferta.</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/ofertas">Ver ofertas disponibles</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.oferta.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.oferta.empresa.nombreComercial}
                      {p.oferta.modalidad ? ` · ${MODALIDAD_LABELS[p.oferta.modalidad] ?? p.oferta.modalidad}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Postulado el {new Date(p.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge
                      variant="outline"
                      className={ESTADO_COLORS[p.estado]}
                    >
                      {ESTADO_LABELS[p.estado]}
                    </Badge>
                    <Button variant="ghost" size="icon" asChild title="Ver detalle">
                      <Link href={`/egresado/postulaciones/${p.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
