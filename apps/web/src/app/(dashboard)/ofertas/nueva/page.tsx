'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z
  .object({
    titulo: z.string().min(1, 'Obligatorio').max(200),
    descripcion: z.string().min(1, 'Obligatorio').max(20000),
    ubicacion: z.string().max(200).optional(),
    modalidad: z.enum(['REMOTO', 'HIBRIDO', 'PRESENCIAL'], { required_error: 'Seleccione modalidad' }),
    tipoContrato: z.enum(['TIEMPO_COMPLETO', 'MEDIO_TIEMPO', 'POR_PROYECTO', 'PRACTICAS'], {
      required_error: 'Seleccione tipo de contrato',
    }),
    salarioMin: z
      .string()
      .optional()
      .transform((v) => (v?.trim() ? Number(v) : undefined))
      .pipe(z.number().min(0).optional()),
    salarioMax: z
      .string()
      .optional()
      .transform((v) => (v?.trim() ? Number(v) : undefined))
      .pipe(z.number().min(0).optional()),
    fechaCierre: z.string().optional(),
  })
  .refine(
    (d) =>
      d.salarioMin === undefined ||
      d.salarioMax === undefined ||
      d.salarioMin <= d.salarioMax,
    { message: 'El salario mínimo no puede ser mayor que el máximo.', path: ['salarioMax'] },
  );

type FormValues = z.input<typeof schema>;

export default function NuevaOfertaPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titulo: '', descripcion: '', modalidad: 'PRESENCIAL', tipoContrato: 'TIEMPO_COMPLETO' },
  });

  const mutation = trpc.ofertas.create.useMutation({
    onSuccess: (data) => {
      toast.success('Oferta publicada correctamente.');
      void utils.ofertas.findAll.invalidate();
      void utils.ofertas.getMisOfertas.invalidate();
      router.push(`/ofertas/${data.id}`);
    },
    onError: (err) => toast.error(err.message ?? 'Error al publicar la oferta.'),
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      titulo: data.titulo,
      descripcion: data.descripcion,
      ubicacion: data.ubicacion || undefined,
      modalidad: data.modalidad as 'REMOTO' | 'HIBRIDO' | 'PRESENCIAL',
      tipoContrato: data.tipoContrato as 'TIEMPO_COMPLETO' | 'MEDIO_TIEMPO' | 'POR_PROYECTO' | 'PRACTICAS',
      salarioMin: data.salarioMin,
      salarioMax: data.salarioMax,
      fechaCierre: data.fechaCierre ? new Date(data.fechaCierre) : undefined,
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/ofertas"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva oferta laboral</h1>
          <p className="text-sm text-muted-foreground">Publica una vacante para egresados.</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Datos de la oferta</CardTitle>
          <CardDescription>Los campos marcados con * son obligatorios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input id="titulo" {...register('titulo')} placeholder="Ej. Desarrollador Backend Senior" />
              {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción *</Label>
              <textarea
                id="descripcion"
                {...register('descripcion')}
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe las responsabilidades, requisitos y beneficios del puesto…"
              />
              {errors.descripcion && <p className="text-xs text-destructive">{errors.descripcion.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Modalidad *</Label>
                <Controller
                  control={control}
                  name="modalidad"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                        <SelectItem value="REMOTO">Remoto</SelectItem>
                        <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.modalidad && <p className="text-xs text-destructive">{errors.modalidad.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Tipo de contrato *</Label>
                <Controller
                  control={control}
                  name="tipoContrato"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TIEMPO_COMPLETO">Tiempo completo</SelectItem>
                        <SelectItem value="MEDIO_TIEMPO">Medio tiempo</SelectItem>
                        <SelectItem value="POR_PROYECTO">Por proyecto</SelectItem>
                        <SelectItem value="PRACTICAS">Prácticas</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tipoContrato && <p className="text-xs text-destructive">{errors.tipoContrato.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ubicacion">Ubicación</Label>
                <Input id="ubicacion" {...register('ubicacion')} placeholder="Ej. Lima, Perú" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaCierre">Fecha de cierre</Label>
                <Input id="fechaCierre" type="date" {...register('fechaCierre')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salarioMin">Salario mínimo (S/)</Label>
                <Input id="salarioMin" type="number" min={0} step="100" {...register('salarioMin')} placeholder="1500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salarioMax">Salario máximo (S/)</Label>
                <Input id="salarioMax" type="number" min={0} step="100" {...register('salarioMax')} placeholder="3000" />
                {errors.salarioMax && <p className="text-xs text-destructive">{errors.salarioMax.message}</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting || mutation.isLoading}>
                {mutation.isLoading ? 'Publicando…' : 'Publicar oferta'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/ofertas">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
