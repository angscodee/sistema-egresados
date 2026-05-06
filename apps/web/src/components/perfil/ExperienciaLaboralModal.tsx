'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const yearRegex = /^\d{4}$/;
const currentYear = new Date().getFullYear();

const schema = z.object({
  empresa: z.string().min(1, 'El nombre de la empresa es obligatorio').max(200),
  cargo: z.string().min(1, 'El cargo es obligatorio').max(200),
  anioInicio: z
    .string()
    .regex(yearRegex, 'Ingresa un año válido (ej. 2020)')
    .transform(Number)
    .refine((n) => n >= 1950 && n <= currentYear, 'Año fuera de rango'),
  anioFin: z
    .string()
    .regex(yearRegex, 'Ingresa un año válido')
    .transform(Number)
    .refine((n) => n >= 1950 && n <= currentYear + 1, 'Año fuera de rango')
    .optional()
    .or(z.literal('')),
  descripcion: z.string().max(1000).optional().or(z.literal('')),
});

type FormValues = z.input<typeof schema>;

export type ExperienciaItem = {
  empresa: string;
  cargo: string;
  anioInicio: number;
  anioFin?: number;
  descripcion?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (item: ExperienciaItem) => void;
  initial?: ExperienciaItem;
};

export function ExperienciaLaboralModal({ open, onClose, onSave, initial }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { empresa: '', cargo: '', anioInicio: '', anioFin: '', descripcion: '' },
  });

  useEffect(() => {
    if (open) {
      reset({
        empresa: initial?.empresa ?? '',
        cargo: initial?.cargo ?? '',
        anioInicio: initial?.anioInicio ? String(initial.anioInicio) : '',
        anioFin: initial?.anioFin ? String(initial.anioFin) : '',
        descripcion: initial?.descripcion ?? '',
      });
    }
  }, [open, initial, reset]);

  function onSubmit(values: FormValues) {
    // react-hook-form + zodResolver already validated and transformed the values
    const anioInicio = typeof values.anioInicio === 'number' ? values.anioInicio : Number(values.anioInicio);
    const anioFin = values.anioFin && values.anioFin !== ''
      ? typeof values.anioFin === 'number' ? values.anioFin : Number(values.anioFin)
      : undefined;
    onSave({
      empresa: values.empresa,
      cargo: values.cargo,
      anioInicio,
      anioFin,
      descripcion: values.descripcion || undefined,
    });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar experiencia' : 'Agregar experiencia laboral'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="el-empresa">Empresa</Label>
            <Input id="el-empresa" placeholder="Nombre de la empresa" {...register('empresa')} />
            {errors.empresa && <p className="text-xs text-destructive">{errors.empresa.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="el-cargo">Cargo</Label>
            <Input id="el-cargo" placeholder="Ej. Desarrollador Backend" {...register('cargo')} />
            {errors.cargo && <p className="text-xs text-destructive">{errors.cargo.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="el-inicio">Año inicio</Label>
              <Input id="el-inicio" placeholder="2020" maxLength={4} {...register('anioInicio')} />
              {errors.anioInicio && <p className="text-xs text-destructive">{errors.anioInicio.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="el-fin">Año fin (opcional)</Label>
              <Input id="el-fin" placeholder="2023" maxLength={4} {...register('anioFin')} />
              {errors.anioFin && <p className="text-xs text-destructive">{errors.anioFin.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="el-desc">Descripción (opcional)</Label>
            <textarea
              id="el-desc"
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Describe tus responsabilidades…"
              {...register('descripcion')}
            />
            {errors.descripcion && <p className="text-xs text-destructive">{errors.descripcion.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
