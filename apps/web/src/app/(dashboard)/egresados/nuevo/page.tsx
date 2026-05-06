'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  nombre: z.string().min(1, 'Obligatorio').max(120),
  apellido: z.string().min(1, 'Obligatorio').max(120),
  dni: z.string().min(6, 'Mínimo 6 caracteres').max(20),
  carrera: z.string().max(200).optional(),
  anioEgreso: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? Number(v) : undefined))
    .pipe(z.number().int().min(1950).optional()),
  telefono: z.string().max(40).optional(),
  direccion: z.string().max(500).optional(),
});

type FormValues = z.input<typeof schema>;

export default function NuevoEgresadoPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', apellido: '', dni: '' },
  });

  const mutation = trpc.egresados.create.useMutation({
    onSuccess: () => {
      toast.success('Egresado creado correctamente.');
      void utils.egresados.findAll.invalidate();
      router.push('/egresados');
    },
    onError: (err) => toast.error(err.message ?? 'Error al crear el egresado.'),
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      carrera: data.carrera || undefined,
      anioEgreso: data.anioEgreso,
      telefono: data.telefono || undefined,
      direccion: data.direccion || undefined,
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/egresados"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo egresado</h1>
          <p className="text-sm text-muted-foreground">Registra un nuevo perfil de egresado.</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Datos del egresado</CardTitle>
          <CardDescription>Los campos marcados con * son obligatorios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input id="nombre" {...register('nombre')} />
                {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido *</Label>
                <Input id="apellido" {...register('apellido')} />
                {errors.apellido && <p className="text-xs text-destructive">{errors.apellido.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni">DNI *</Label>
                <Input id="dni" {...register('dni')} />
                {errors.dni && <p className="text-xs text-destructive">{errors.dni.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="carrera">Carrera</Label>
                <Input id="carrera" {...register('carrera')} placeholder="Ej. Ingeniería de Sistemas" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="anioEgreso">Año de egreso</Label>
                <Input id="anioEgreso" type="number" min={1950} max={2100} {...register('anioEgreso')} placeholder="2024" />
                {errors.anioEgreso && <p className="text-xs text-destructive">{errors.anioEgreso.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" {...register('telefono')} placeholder="+51 999 999 999" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input id="direccion" {...register('direccion')} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? 'Guardando…' : 'Crear egresado'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/egresados">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
