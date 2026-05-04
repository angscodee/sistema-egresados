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

const schema = z.object({
  institucion: z.string().min(1, 'La institución es obligatoria').max(200),
  titulo: z.string().min(1, 'El título es obligatorio').max(200),
  anioInicio: z
    .string()
    .regex(/^\d{4}$/, 'Ingresa un año válido (ej. 2018)')
    .transform(Number)
    .refine((n) => n >= 1950 && n <= new Date().getFullYear(), 'Año fuera de rango'),
  anioFin: z
    .string()
    .regex(/^\d{4}$/, 'Ingresa un año válido')
    .transform(Number)
    .refine((n) => n >= 1950 && n <= new Date().getFullYear() + 5, 'Año fuera de rango')
    .optional()
    .or(z.literal('')),
});

type FormValues = z.input<typeof schema>;

export type FormacionItem = {
  institucion: string;
  titulo: string;
  anioInicio: number;
  anioFin?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (item: FormacionItem) => void;
  initial?: FormacionItem;
};

export function FormacionAcademicaModal({ open, onClose, onSave, initial }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      institucion: '',
      titulo: '',
      anioInicio: '',
      anioFin: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        institucion: initial?.institucion ?? '',
        titulo: initial?.titulo ?? '',
        anioInicio: initial?.anioInicio ? String(initial.anioInicio) : '',
        anioFin: initial?.anioFin ? String(initial.anioFin) : '',
      });
    }
  }, [open, initial, reset]);

  function onSubmit(values: FormValues) {
    const parsed = schema.parse(values);
    onSave({
      institucion: parsed.institucion,
      titulo: parsed.titulo,
      anioInicio: parsed.anioInicio as number,
      anioFin: parsed.anioFin ? (parsed.anioFin as number) : undefined,
    });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar formación' : 'Agregar formación académica'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fa-institucion">Institución</Label>
            <Input id="fa-institucion" placeholder="Universidad / Instituto" {...register('institucion')} />
            {errors.institucion && <p className="text-xs text-destructive">{errors.institucion.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fa-titulo">Título / Grado</Label>
            <Input id="fa-titulo" placeholder="Ej. Bachiller en Ingeniería" {...register('titulo')} />
            {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fa-inicio">Año inicio</Label>
              <Input id="fa-inicio" placeholder="2018" maxLength={4} {...register('anioInicio')} />
              {errors.anioInicio && <p className="text-xs text-destructive">{errors.anioInicio.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fa-fin">Año fin (opcional)</Label>
              <Input id="fa-fin" placeholder="2022" maxLength={4} {...register('anioFin')} />
              {errors.anioFin && <p className="text-xs text-destructive">{errors.anioFin.message}</p>}
            </div>
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
