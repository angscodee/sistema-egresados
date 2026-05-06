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
import type { EgresadoCursorItem } from '@/lib/api-types';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

const PAGE_SIZE = 15;

const CARRERAS = [
  'Ingeniería de Sistemas',
  'Ingeniería Industrial',
  'Administración',
  'Contabilidad',
  'Derecho',
  'Medicina',
  'Psicología',
  'Arquitectura',
];

const currentYear = new Date().getFullYear();
const ANIOS = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);

export default function AdminEgresadosPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState('');
  const [carrera, setCarrera] = useState('');
  const [anio, setAnio] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null);

  const anioNum = anio ? Number.parseInt(anio, 10) : undefined;

  const query = trpc.egresados.buscarConFiltros.useQuery({
    cursor,
    take: PAGE_SIZE,
    search: search.trim() || undefined,
    carrera: carrera || undefined,
    anioEgreso: anioNum && !Number.isNaN(anioNum) ? anioNum : undefined,
  });

  const deleteMutation = trpc.egresados.delete.useMutation({
    onSuccess: () => {
      toast.success('Egresado eliminado correctamente.');
      setDeleteTarget(null);
      void utils.egresados.buscarConFiltros.invalidate();
    },
    onError: (err) => {
      toast.error(err.message ?? 'Error al eliminar el egresado.');
    },
  });

  const { data, isLoading, isFetching } = query;
  const items = (data?.items ?? []) as EgresadoCursorItem[];

  function resetPagination() {
    setCursor(undefined);
    setCursorStack([undefined]);
    setPageIndex(0);
  }

  function goNext() {
    if (!data?.nextCursor) return;
    const newStack = [...cursorStack, data.nextCursor];
    setCursorStack(newStack);
    setCursor(data.nextCursor);
    setPageIndex((p) => p + 1);
  }

  function goPrev() {
    if (pageIndex <= 0) return;
    const newStack = cursorStack.slice(0, -1);
    setCursorStack(newStack);
    setCursor(newStack[newStack.length - 1]);
    setPageIndex((p) => p - 1);
  }

  if (user?.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Egresados</h1>
        <p className="text-muted-foreground">Administra los perfiles de egresados registrados.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              placeholder="Nombre o email…"
              value={search}
              className="w-52"
              onChange={(e) => {
                setSearch(e.target.value);
                resetPagination();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Carrera</Label>
            <Select
              value={carrera}
              onValueChange={(v) => {
                setCarrera(v === '_all' ? '' : v);
                resetPagination();
              }}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todas las carreras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas las carreras</SelectItem>
                {CARRERAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Año de egreso</Label>
            <Select
              value={anio}
              onValueChange={(v) => {
                setAnio(v === '_all' ? '' : v);
                resetPagination();
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos</SelectItem>
                {ANIOS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearch('');
              setCarrera('');
              setAnio('');
              resetPagination();
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
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Carrera</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Habilidades</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No se encontraron egresados.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        {e.nombre} {e.apellido}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.user.email}</TableCell>
                      <TableCell>{e.carrera ?? '—'}</TableCell>
                      <TableCell>{e.anioEgreso ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex max-w-[200px] flex-wrap gap-1">
                          {e.habilidades.slice(0, 3).map((h) => (
                            <Badge key={h.habilidadId} variant="secondary" className="text-xs font-normal">
                              {h.habilidad.nombre}
                            </Badge>
                          ))}
                          {e.habilidades.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{e.habilidades.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild title="Ver detalle">
                            <Link href={`/admin/egresados/${e.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Editar">
                            <Link href={`/admin/egresados/${e.id}?edit=1`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget({ id: e.id, nombre: `${e.nombre} ${e.apellido}` })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" disabled={pageIndex <= 0} onClick={goPrev}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">Página {pageIndex + 1}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!data?.hasNextPage}
              onClick={goNext}
            >
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar egresado</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a{' '}
              <span className="font-semibold">{deleteTarget?.nombre}</span>? Esta acción no se puede
              deshacer y eliminará todos sus datos, postulaciones e historial.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
            >
              {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
