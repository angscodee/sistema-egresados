'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EgresadoListItem } from '@/lib/api-types';
import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';

const PAGE_SIZE = 10;

export default function EgresadosPage() {
  const [carrera, setCarrera] = useState('');
  const [anio, setAnio] = useState('');
  const [page, setPage] = useState(0);

  const anioNum = anio.trim() === '' ? undefined : Number.parseInt(anio, 10);
  const anioEgreso = anioNum !== undefined && !Number.isNaN(anioNum) ? anioNum : undefined;

  const query = trpc.egresados.findAll.useQuery({
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
    carrera: carrera.trim() || undefined,
    anioEgreso,
  });

  const { data, isLoading, isFetching } = query;
  const items: EgresadoListItem[] = (data?.items ?? []) as EgresadoListItem[];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Egresados</h1>
        <p className="text-muted-foreground">Directorio con filtros y paginación.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Combine carrera y año de egreso.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="carrera">Carrera</Label>
            <Input
              id="carrera"
              placeholder="Ej. Ingeniería"
              value={carrera}
              onChange={(e) => {
                setCarrera(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anio">Año de egreso</Label>
            <Input
              id="anio"
              type="number"
              placeholder="2024"
              value={anio}
              onChange={(e) => {
                setAnio(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setCarrera('');
              setAnio('');
              setPage(0);
            }}
          >
            Limpiar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Resultados</CardTitle>
          {data ? (
            <span className="text-sm text-muted-foreground">
              {data.total} registro{data.total !== 1 ? 's' : ''}
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {isLoading || isFetching ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Carrera</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Habilidades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {e.nombre} {e.apellido}
                    </TableCell>
                    <TableCell>{e.dni}</TableCell>
                    <TableCell>{e.carrera ?? '—'}</TableCell>
                    <TableCell>{e.anioEgreso ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex max-w-[220px] flex-wrap gap-1">
                        {e.habilidades.slice(0, 4).map((h) => (
                          <Badge key={h.habilidadId} variant="secondary" className="text-xs font-normal">
                            {h.habilidad.nombre}
                          </Badge>
                        ))}
                        {e.habilidades.length > 4 ? (
                          <Badge variant="outline" className="text-xs">
                            +{e.habilidades.length - 4}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="mt-4 flex items-center justify-between">
            <Button type="button" variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
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
    </div>
  );
}
