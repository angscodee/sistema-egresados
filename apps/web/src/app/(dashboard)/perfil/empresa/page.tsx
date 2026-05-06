'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { useFileUpload } from '@/hooks/useFileUpload';
import { trpc } from '@/lib/trpc/client';
import { Building2, Pencil, Upload } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import type { EstadoValidacion } from '@/lib/api-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const schema = z.object({
  nombreComercial: z.string().min(1, 'Obligatorio').max(200),
  razonSocial: z.string().min(1, 'Obligatorio').max(200),
  ruc: z.string().min(8, 'RUC inválido').max(20),
  sector: z.string().max(100).optional().or(z.literal('')),
  sitioWeb: z
    .string()
    .url('URL inválida')
    .optional()
    .or(z.literal('')),
  descripcion: z.string().max(2000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const ESTADO_BADGE: Record<EstadoValidacion, { label: string; className: string }> = {
  PENDIENTE: { label: 'Pendiente de validación', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  APROBADA: { label: 'Empresa aprobada', className: 'bg-green-100 text-green-800 border-green-200' },
  RECHAZADA: { label: 'Empresa rechazada', className: 'bg-red-100 text-red-800 border-red-200' },
};

export default function PerfilEmpresaPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = trpc.empresas.findOne.useQuery(
    { id: user?.id ?? '' },
    { enabled: !!user?.id && user.role === 'EMPRESA' },
  );

  const updateMutation = trpc.empresas.update.useMutation({
    onSuccess: () => {
      toast.success('Perfil actualizado.');
      void utils.empresas.findOne.invalidate({ id: user?.id });
    },
    onError: (err) => toast.error(err.message ?? 'Error al guardar.'),
  });

  const logoUpload = useFileUpload({
    url: `${API_URL}/empresas/${user?.id}/logo`,
    maxSizeMb: 2,
    accept: ['image/jpeg', 'image/png', 'image/webp'],
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (data) {
      reset({
        nombreComercial: data.nombreComercial,
        razonSocial: data.razonSocial,
        ruc: data.ruc,
        sector: data.sector ?? '',
        sitioWeb: data.sitioWeb ?? '',
        descripcion: data.descripcion ?? '',
      });
    }
  }, [data, reset]);

  if (user?.role !== 'EMPRESA') return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  function onSubmit(values: FormValues) {
    if (!user?.id) return;
    updateMutation.mutate({
      id: user.id,
      data: {
        nombreComercial: values.nombreComercial,
        razonSocial: values.razonSocial,
        ruc: values.ruc,
        sector: values.sector || null,
        sitioWeb: values.sitioWeb || null,
        descripcion: values.descripcion || null,
      },
    });
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await logoUpload.upload(file);
    if (result) {
      toast.success('Logo actualizado.');
      void utils.empresas.findOne.invalidate({ id: user?.id });
    } else if (logoUpload.error) {
      toast.error(logoUpload.error);
    }
    e.target.value = '';
  }

  const estadoBadge = data
    ? ESTADO_BADGE[data.estadoValidacion as EstadoValidacion]
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perfil de empresa</h1>
          <p className="text-muted-foreground">Mantén la información de tu empresa actualizada.</p>
        </div>
        {estadoBadge && (
          <Badge variant="outline" className={estadoBadge.className}>
            {estadoBadge.label}
          </Badge>
        )}
      </div>

      {data?.estadoValidacion === 'RECHAZADA' && data.motivoRechazo && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Motivo de rechazo:</p>
          <p className="mt-1 text-sm text-red-600">{data.motivoRechazo}</p>
        </div>
      )}

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Logo de la empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            {data?.logoUrl ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-lg border">
                <Image
                  src={`${API_URL}${data.logoUrl}`}
                  alt="Logo empresa"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-muted">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted"
              title="Cambiar logo"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={logoUpload.uploading}
              onClick={() => logoInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {logoUpload.uploading ? 'Subiendo…' : 'Subir logo'}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG o WebP · máx. 2 MB</p>
            {logoUpload.error && (
              <p className="mt-1 text-xs text-destructive">{logoUpload.error}</p>
            )}
          </div>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </CardContent>
      </Card>

      {/* Company data form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos de la empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-nombre">Nombre comercial</Label>
                <Input id="e-nombre" {...register('nombreComercial')} />
                {errors.nombreComercial && (
                  <p className="text-xs text-destructive">{errors.nombreComercial.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-razon">Razón social</Label>
                <Input id="e-razon" {...register('razonSocial')} />
                {errors.razonSocial && (
                  <p className="text-xs text-destructive">{errors.razonSocial.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-ruc">RUC</Label>
                <Input id="e-ruc" {...register('ruc')} />
                {errors.ruc && <p className="text-xs text-destructive">{errors.ruc.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-sector">Sector</Label>
                <Input id="e-sector" placeholder="Ej. Tecnología, Salud…" {...register('sector')} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="e-web">Sitio web</Label>
                <Input id="e-web" placeholder="https://miempresa.com" {...register('sitioWeb')} />
                {errors.sitioWeb && (
                  <p className="text-xs text-destructive">{errors.sitioWeb.message}</p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="e-desc">Descripción</Label>
                <textarea
                  id="e-desc"
                  rows={4}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Describe tu empresa, misión y valores…"
                  {...register('descripcion')}
                />
                {errors.descripcion && (
                  <p className="text-xs text-destructive">{errors.descripcion.message}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
                {updateMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
