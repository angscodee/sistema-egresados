'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoHabilidad = 'TECNICA' | 'BLANDA';

type HabilidadItem = {
  id: string;
  nombre: string;
  tipo: TipoHabilidad;
  categoria: string | null;
  _count: { egresados: number; ofertas: number };
};

// ─── Habilidad form schema ────────────────────────────────────────────────────

const habilidadSchema = z.object({
  nombre: z.string().min(1, 'Obligatorio').max(100),
  tipo: z.enum(['TECNICA', 'BLANDA'] as const),
  categoria: z.string().max(100).optional().or(z.literal('')),
});

type HabilidadFormValues = z.infer<typeof habilidadSchema>;

// ─── Habilidad modal ──────────────────────────────────────────────────────────

function HabilidadModal({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: HabilidadItem;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HabilidadFormValues>({
    resolver: zodResolver(habilidadSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: { nombre: '', tipo: 'TECNICA', categoria: '' },
  });

  const tipoValue = watch('tipo');

  useEffect(() => {
    if (open) {
      reset({
        nombre: initial?.nombre ?? '',
        tipo: (initial?.tipo as TipoHabilidad) ?? 'TECNICA',
        categoria: initial?.categoria ?? '',
      });
    }
  }, [open, initial, reset]);

  const createMutation = trpc.habilidades.create.useMutation({
    onSuccess: () => {
      toast.success('Habilidad creada.');
      void utils.habilidades.findAll.invalidate();
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.message ?? 'Error al crear.'),
  });

  const updateMutation = trpc.habilidades.update.useMutation({
    onSuccess: () => {
      toast.success('Habilidad actualizada.');
      void utils.habilidades.findAll.invalidate();
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(err.message ?? 'Error al actualizar.'),
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: HabilidadFormValues) {
    if (initial) {
      updateMutation.mutate({
        id: initial.id,
        data: {
          nombre: values.nombre,
          tipo: values.tipo,
          categoria: values.categoria || null,
        },
      });
    } else {
      createMutation.mutate({
        nombre: values.nombre,
        tipo: values.tipo,
        categoria: values.categoria || undefined,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar habilidad' : 'Nueva habilidad'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="h-nombre">Nombre</Label>
            <Input id="h-nombre" placeholder="Ej. React" {...register('nombre')} />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={tipoValue}
              onValueChange={(v) => setValue('tipo', v as TipoHabilidad)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TECNICA">Técnica</SelectItem>
                <SelectItem value="BLANDA">Blanda</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-cat">Categoría (opcional)</Label>
            <Input id="h-cat" placeholder="Ej. Desarrollo, Soft Skills" {...register('categoria')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HabilidadItem | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<HabilidadItem | null>(null);
  const [search, setSearch] = useState('');

  const { data: rawData, isLoading } = trpc.habilidades.findAll.useQuery(
    { search: search.trim() || undefined },
    { enabled: user?.role === 'ADMIN', keepPreviousData: true },
  );

  const habilidades = (rawData ?? []) as HabilidadItem[];

  const deleteMutation = trpc.habilidades.delete.useMutation({
    onSuccess: () => {
      toast.success('Habilidad eliminada.');
      setDeleteTarget(null);
      void utils.habilidades.findAll.invalidate();
    },
    onError: (err) => toast.error(err.message ?? 'Error al eliminar.'),
  });

  if (user?.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Administra el catálogo de habilidades y ajustes generales.</p>
      </div>

      <Tabs defaultValue="habilidades">
        <TabsList>
          <TabsTrigger value="habilidades">Habilidades</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        {/* ── Tab: Habilidades ─────────────────────────────────────────── */}
        <TabsContent value="habilidades" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              placeholder="Buscar habilidad…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Button
              onClick={() => {
                setEditTarget(undefined);
                setModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva habilidad
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Egresados</TableHead>
                      <TableHead>Ofertas</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {habilidades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          No se encontraron habilidades.
                        </TableCell>
                      </TableRow>
                    ) : (
                      habilidades.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium">{h.nombre}</TableCell>
                          <TableCell>
                            <Badge
                              variant={h.tipo === 'TECNICA' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {h.tipo === 'TECNICA' ? 'Técnica' : 'Blanda'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {h.categoria ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm">{h._count.egresados}</TableCell>
                          <TableCell className="text-sm">{h._count.ofertas}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar"
                                onClick={() => {
                                  setEditTarget(h);
                                  setModalOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Eliminar"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(h)}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: General ─────────────────────────────────────────────── */}
        <TabsContent value="general" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información de la institución</CardTitle>
              <CardDescription>
                Estos datos aparecen en reportes y comunicaciones del sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inst-nombre">Nombre de la institución</Label>
                <Input
                  id="inst-nombre"
                  placeholder="Universidad / Instituto"
                  defaultValue={process.env.NEXT_PUBLIC_INSTITUTION_NAME ?? ''}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inst-logo">URL del logo</Label>
                <Input
                  id="inst-logo"
                  placeholder="https://mi-institucion.edu.pe/logo.png"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="color-primary">Color primario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color-primary"
                      type="color"
                      className="h-9 w-14 cursor-pointer p-1"
                      defaultValue="#2563eb"
                    />
                    <Input placeholder="#2563eb" className="flex-1" defaultValue="#2563eb" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="color-secondary">Color secundario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color-secondary"
                      type="color"
                      className="h-9 w-14 cursor-pointer p-1"
                      defaultValue="#7c3aed"
                    />
                    <Input placeholder="#7c3aed" className="flex-1" defaultValue="#7c3aed" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => toast.info('Configuración general guardada (demo).')}
                >
                  Guardar cambios
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información del sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Versión</span>
                <span className="font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Total habilidades</span>
                <span className="font-mono">{habilidades.length}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Habilidad create/edit modal */}
      <HabilidadModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(undefined);
        }}
        initial={editTarget}
        onSaved={() => setEditTarget(undefined)}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar habilidad</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Eliminar <span className="font-semibold">{deleteTarget?.nombre}</span>? Esta acción
            eliminará la habilidad del catálogo y de todos los perfiles que la tengan asignada.
          </p>
          {deleteTarget && (deleteTarget._count.egresados > 0 || deleteTarget._count.ofertas > 0) && (
            <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700 border border-yellow-200">
              ⚠ Esta habilidad está asignada a {deleteTarget._count.egresados} egresado(s) y{' '}
              {deleteTarget._count.ofertas} oferta(s).
            </p>
          )}
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
