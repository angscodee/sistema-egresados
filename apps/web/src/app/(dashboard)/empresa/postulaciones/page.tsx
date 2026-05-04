'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { MiOfertaItem, PostulanteItem } from '@/lib/api-types';
import { ESTADO_COLORS, ESTADO_LABELS } from '@/lib/postulacion-estados';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import { Eye, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function EmpresaPostulacionesPage() {
  const { user } = useAuth();
  const [ofertaId, setOfertaId] = useState<string>('');

  const { data: ofertasRaw, isLoading: loadingOfertas } = trpc.ofertas.getMisOfertas.useQuery(undefined, {
    enabled: user?.role === 'EMPRESA',
  });

  const ofertas = (ofertasRaw ?? []) as MiOfertaItem[];

  const { data: postulantesRaw, isLoading: loadingPostulantes } = trpc.postulaciones.getPostulantesPorOferta.useQuery(
    { ofertaId },
    { enabled: !!ofertaId },
  );

  const postulantes = (postulantesRaw ?? []) as PostulanteItem[];

  // Fetch match for each postulante when oferta is selected
  const matchQueries = trpc.useQueries((t) =>
    postulantes.map((p) =>
      t.postulaciones.calcularMatch(
        { egresadoId: p.egresado.id, ofertaId },
        { enabled: !!ofertaId && postulantes.length > 0 },
      ),
    ),
  );

  if (user?.role !== 'EMPRESA') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Postulaciones recibidas</h1>
        <p className="text-muted-foreground">Revisa y gestiona los candidatos por oferta.</p>
      </div>

      {/* Offer selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleccionar oferta</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOfertas ? (
            <Skeleton className="h-9 w-72" />
          ) : (
            <Select value={ofertaId} onValueChange={setOfertaId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Elige una oferta para ver sus postulantes…" />
              </SelectTrigger>
              <SelectContent>
                {ofertas.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.titulo}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({o._count.postulaciones} postulante{o._count.postulaciones !== 1 ? 's' : ''})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Postulantes table */}
      {ofertaId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {loadingPostulantes ? '…' : `${postulantes.length} postulante${postulantes.length !== 1 ? 's' : ''}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPostulantes ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : postulantes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Esta oferta aún no tiene postulantes.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Carrera</TableHead>
                    <TableHead>Fecha postulación</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postulantes.map((p, idx) => {
                    const matchPct = matchQueries[idx]?.data as number | undefined;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.egresado.nombre} {p.egresado.apellido}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.egresado.carrera ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(p.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          {matchPct !== undefined ? (
                            <span
                              className={`text-sm font-semibold ${
                                matchPct >= 70
                                  ? 'text-green-600'
                                  : matchPct >= 40
                                    ? 'text-yellow-600'
                                    : 'text-red-500'
                              }`}
                            >
                              {matchPct}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ESTADO_COLORS[p.estado]}>
                            {ESTADO_LABELS[p.estado]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild title="Gestionar postulación">
                              <Link href={`/empresa/postulaciones/${p.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild title="Ver perfil completo">
                              <Link href={`/egresados/${p.egresado.id}`}>
                                <UserCircle className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
