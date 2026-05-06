'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { OfertaListItem } from '@/lib/api-types';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import { Eye, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const PAGE_SIZE = 10;

export default function OfertasPage() {
  const { user } = useAuth();
  const [modalidad, setModalidad] = useState<string>('');
  const [tipoContrato, setTipoContrato] = useState<string>('');
  const [salarioMin, setSalarioMin] = useState('');
  const [salarioMax, setSalarioMax] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [page, setPage] = useState(0);

  const smin = salarioMin.trim() === '' ? undefined : Number.parseFloat(salarioMin);
  const smax = salarioMax.trim() === '' ? undefined : Number.parseFloat(salarioMax);

  const query = trpc.ofertas.findAll.useQuery({
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
    modalidad: modalidad ? (modalidad as 'REMOTO' | 'HIBRIDO' | 'PRESENCIAL') : undefined,
    tipoContrato: tipoContrato
      ? (tipoContrato as 'TIEMPO_COMPLETO' | 'MEDIO_TIEMPO' | 'POR_PROYECTO' | 'PRACTICAS')
      : undefined,
    salarioMin: smin !== undefined && !Number.isNaN(smin) ? smin : undefined,
    salarioMax: smax !== undefined && !Number.isNaN(smax) ? smax : undefined,
    ubicacion: ubicacion.trim() || undefined,
  });

  const { data, isLoading, isFetching } = query;
  const items: OfertaListItem[] = (data?.items ?? []) as OfertaListItem[];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ofertas laborales</h1>
          <p className="text-muted-foreground">Vacantes publicadas en la plataforma.</p>
        </div>
        {user?.role === 'EMPRESA' && (
          <Button asChild>
            <Link href="/ofertas/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Nueva oferta
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Modalidad, contrato, rango salarial y ubicación.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Modalidad</Label>
            <Select
              value={modalidad || '__all__'}
              onValueChange={(v) => {
                setModalidad(v === '__all__' ? '' : v);
                setPage(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                <SelectItem value="REMOTO">Remoto</SelectItem>
                <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                <SelectItem value="PRESENCIAL">Presencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de contrato</Label>
            <Select
              value={tipoContrato || '__all__'}
              onValueChange={(v) => {
                setTipoContrato(v === '__all__' ? '' : v);
                setPage(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="TIEMPO_COMPLETO">Tiempo completo</SelectItem>
                <SelectItem value="MEDIO_TIEMPO">Medio tiempo</SelectItem>
                <SelectItem value="POR_PROYECTO">Por proyecto</SelectItem>
                <SelectItem value="PRACTICAS">Prácticas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ubicacion">Ubicación</Label>
            <Input
              id="ubicacion"
              placeholder="Ciudad o región"
              value={ubicacion}
              onChange={(e) => {
                setUbicacion(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smin">Salario mínimo (oferta ≥)</Label>
            <Input
              id="smin"
              type="number"
              min={0}
              step="100"
              value={salarioMin}
              onChange={(e) => {
                setSalarioMin(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smax">Salario máximo (oferta ≤)</Label>
            <Input
              id="smax"
              type="number"
              min={0}
              step="100"
              value={salarioMax}
              onChange={(e) => {
                setSalarioMax(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalidad('');
                setTipoContrato('');
                setSalarioMin('');
                setSalarioMax('');
                setUbicacion('');
                setPage(0);
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Listado</CardTitle>
          {data ? (
            <span className="text-sm text-muted-foreground">
              {data.total} oferta{data.total !== 1 ? 's' : ''}
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {isLoading || isFetching ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Salario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="max-w-[200px] font-medium">{o.titulo}</TableCell>
                    <TableCell>{o.empresa.nombreComercial}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{o.modalidad}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{o.tipoContrato.replaceAll('_', ' ')}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {o.salarioMin != null || o.salarioMax != null
                        ? `${o.salarioMin ?? '—'} – ${o.salarioMax ?? '—'}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={o.estado === 'ACTIVA' ? 'default' : 'secondary'}>{o.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/ofertas/${o.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
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
