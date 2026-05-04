'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EmpresaListItem, EstadoValidacion } from '@/lib/api-types';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import { CheckCircle2, Eye, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

const PAGE_SIZE = 15;

const ESTADO_BADGE: Record<
  EstadoValidacion,
  { label: string; className: string }
> = {
  PENDIENTE: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  APROBADA: { label: 'Aprobada', className: 'bg-green-100 text-green-800 border-green-200' },
  RECHAZADA: { label: 'Rechazada', className: 'bg-red-100 text-red-800 border-red-200' },
};

export default function AdminEmpresasPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoValidacion | ''>('');
  const [page, setPage] = useState(0);

  const [rechazarTarget, setRechazarTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [motivo, setMotivo] = useState('');

  const query = trpc.empresas.findAll.useQuery({
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
    search: search.trim() || undefined,
    estadoValidacion: estadoFiltro || undefined,
  });

  const validarMutation = trpc.empresas.validar.useMutation({
    onSuccess: () => {
      toast.success('Empresa aprobada correctamente.');
      void utils.empresas.findAll.invalidate();
    },
    onError: (err) => toast.error(err.message ?? 'Error al aprobar la empresa.'),
  });

  const rechazarMutation = trpc.empresas.rechazar.useMutation({
    onSuccess: () => {
      toast.success('Empresa rechazada.');
      setRechazarTarget(null);
      setMotivo('');
      void utils.empresas.findAll.invalidate();
    },
    onError: (err) => toast.error(err.message ?? 'Error al rechazar la empresa.'),
  });

  const { data, isLoading, isFetching } = query;
  const items = (data?.items ?? []) as EmpresaListItem[];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  function resetPage() {
    setPage(0);
  }

  if (user?.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Empresas</h1>
        <p className="text-muted-foreground">Valida y administra las empresas registradas.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="search-empresa">Buscar</Label>
            <Input
              id="search-empresa"
              placeholder="Nombre, razón social o RUC…"
              value={search}
              className="w-64"
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select
              value={estadoFiltro}
              onValueChange={(v) => {
                setEstadoFiltro(v === '_all' ? '' : (v as EstadoValidacion));
                resetPage();
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="APROBADA">Aprobada</SelectItem>
                <SelectItem value="RECHAZADA">Rechazada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearch('');
              setEstadoFiltro('');
              resetPage();
            }}
          >
            Limpiar
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading || isFetching ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre comercial</TableHead>
                  <TableHead>RUC</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ofertas activas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No se encontraron empresas.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((e) => {
                    const estadoBadge = ESTADO_BADGE[e.estadoValidacion];
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.nombreComercial}</TableCell>
                        <TableCell className="font-mono text-sm">{e.ruc}</TableCell>
                        <TableCell>{e.sector ?? '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={estadoBadge.className}
                          >
                            {estadoBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{e._count.ofertas}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild title="Ver detalle">
                              <Link href={`/admin/empresas/${e.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            {e.estadoValidacion === 'PENDIENTE' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Aprobar"
                                  className="text-green-600 hover:text-green-700"
                                  disabled={validarMutation.isLoading}
                                  onClick={() => validarMutation.mutate({ id: e.id })}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Rechazar"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setRechazarTarget({ id: e.id, nombre: e.nombreComercial });
                                    setMotivo('');
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!data || page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reject modal */}
      <Dialog
        open={!!rechazarTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRechazarTarget(null);
            setMotivo('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar empresa</DialogTitle>
            <DialogDescription>
              Indica el motivo de rechazo para{' '}
              <span className="font-semibold">{rechazarTarget?.nombre}</span>. Este mensaje será
              visible para la empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-rechazo">Motivo</Label>
            <textarea
              id="motivo-rechazo"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={4}
              placeholder="Describe el motivo del rechazo…"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRechazarTarget(null);
                setMotivo('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!motivo.trim() || rechazarMutation.isLoading}
              onClick={() => {
                if (rechazarTarget && motivo.trim()) {
                  rechazarMutation.mutate({ id: rechazarTarget.id, motivo: motivo.trim() });
                }
              }}
            >
              {rechazarMutation.isLoading ? 'Rechazando…' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
