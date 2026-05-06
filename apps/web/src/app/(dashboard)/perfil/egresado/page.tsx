'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ExperienciaLaboralModal, type ExperienciaItem } from '@/components/perfil/ExperienciaLaboralModal';
import { FormacionAcademicaModal, type FormacionItem } from '@/components/perfil/FormacionAcademicaModal';
import { HabilidadesSelector, type NivelHabilidad } from '@/components/perfil/HabilidadesSelector';
import { useAuth } from '@/lib/auth-context';
import { useFileUpload } from '@/hooks/useFileUpload';
import { trpc } from '@/lib/trpc/client';
import {
  Briefcase,
  Download,
  FileText,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const personalSchema = z.object({
  nombre: z.string().min(1, 'Obligatorio').max(120),
  apellido: z.string().min(1, 'Obligatorio').max(120),
  telefono: z.string().max(40).optional().or(z.literal('')),
  direccion: z.string().max(500).optional().or(z.literal('')),
  fechaNacimiento: z.string().optional().or(z.literal('')),
  carrera: z.string().max(200).optional().or(z.literal('')),
  anioEgreso: z
    .string()
    .regex(/^\d{4}$/, 'Año inválido')
    .transform(Number)
    .refine((n) => n >= 1950 && n <= new Date().getFullYear(), 'Año fuera de rango')
    .optional()
    .or(z.literal('')),
});

type PersonalFormValues = z.input<typeof personalSchema>;

const NIVEL_LABELS: Record<NivelHabilidad, string> = {
  BASICO: 'Básico',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
  EXPERTO: 'Experto',
};

type EgresadoProfile = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string | null;
  direccion: string | null;
  carrera: string | null;
  anioEgreso: number | null;
  cvUrl: string | null;
  fechaNacimiento: Date | string | null;
  formacionAcademica: unknown;
  experienciaLaboral: unknown;
  habilidades: Array<{
    habilidadId: string;
    nivel: string;
    habilidad: { nombre: string };
  }>;
  postulaciones: Array<{
    id: string;
    estado: string;
    createdAt: Date | string;
    oferta: { id: string; titulo: string; estado: string; empresaId: string };
  }>;
};

export default function PerfilEgresadoPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [formacionOpen, setFormacionOpen] = useState(false);
  const [formacionEdit, setFormacionEdit] = useState<{ item: FormacionItem; index: number } | null>(null);
  const [experienciaOpen, setExperienciaOpen] = useState(false);
  const [experienciaEdit, setExperienciaEdit] = useState<{ item: ExperienciaItem; index: number } | null>(null);
  const [habilidadesOpen, setHabilidadesOpen] = useState(false);

  const cvInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: rawData, isLoading } = trpc.egresados.findOne.useQuery(
    { id: user?.id ?? '' },
    { enabled: !!user?.id && user.role === 'EGRESADO' },
  );
  const data = rawData as EgresadoProfile | undefined;

  const updateMutation = trpc.egresados.update.useMutation({
    onSuccess: () => {
      toast.success('Perfil actualizado.');
      void utils.egresados.findOne.invalidate({ id: user?.id });
    },
    onError: (err) => toast.error(err.message ?? 'Error al guardar.'),
  });

  const agregarHabilidadMutation = trpc.egresados.agregarHabilidad.useMutation({
    onSuccess: () => {
      toast.success('Habilidad agregada.');
      void utils.egresados.findOne.invalidate({ id: user?.id });
    },
    onError: (err) => toast.error(err.message ?? 'Error al agregar habilidad.'),
  });

  const eliminarHabilidadMutation = trpc.egresados.eliminarHabilidad.useMutation({
    onSuccess: () => {
      toast.success('Habilidad eliminada.');
      void utils.egresados.findOne.invalidate({ id: user?.id });
    },
    onError: (err) => toast.error(err.message ?? 'Error al eliminar habilidad.'),
  });

  const cvUpload = useFileUpload({
    url: `${API_URL}/egresados/${user?.id}/cv`,
    maxSizeMb: 5,
    accept: ['application/pdf'],
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<PersonalFormValues>({ resolver: zodResolver(personalSchema) as any });

  useEffect(() => {
    if (data) {
      reset({
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono ?? '',
        direccion: data.direccion ?? '',
        fechaNacimiento: data.fechaNacimiento
          ? new Date(data.fechaNacimiento).toISOString().slice(0, 10)
          : '',
        carrera: data.carrera ?? '',
        anioEgreso: data.anioEgreso ? String(data.anioEgreso) : '',
      });
    }
  }, [data, reset]);

  if (user?.role !== 'EGRESADO') return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const formacion = (data?.formacionAcademica ?? []) as FormacionItem[];
  const experiencia = (data?.experienciaLaboral ?? []) as ExperienciaItem[];
  const habilidades = data?.habilidades ?? [];

  function savePersonal(values: PersonalFormValues) {
    if (!user?.id) return;
    // react-hook-form + zodResolver already validated and transformed the values
    // anioEgreso comes as number after transform, or '' if empty
    const anioEgreso = values.anioEgreso
      ? typeof values.anioEgreso === 'number'
        ? values.anioEgreso
        : Number(values.anioEgreso)
      : null;
    updateMutation.mutate({
      id: user.id,
      data: {
        nombre: values.nombre,
        apellido: values.apellido,
        telefono: values.telefono || null,
        direccion: values.direccion || null,
        fechaNacimiento: values.fechaNacimiento ? new Date(values.fechaNacimiento) : null,
        carrera: values.carrera || null,
        anioEgreso: anioEgreso || null,
      },
    });
  }

  function saveFormacion(items: FormacionItem[]) {
    if (!user?.id) return;
    updateMutation.mutate({ id: user.id, data: { formacionAcademica: items } });
  }

  function saveExperiencia(items: ExperienciaItem[]) {
    if (!user?.id) return;
    updateMutation.mutate({ id: user.id, data: { experienciaLaboral: items } });
  }

  function handleAddFormacion(item: FormacionItem) {
    if (formacionEdit !== null) {
      const updated = [...formacion];
      updated[formacionEdit.index] = item;
      saveFormacion(updated);
    } else {
      saveFormacion([...formacion, item]);
    }
    setFormacionEdit(null);
  }

  function handleDeleteFormacion(index: number) {
    saveFormacion(formacion.filter((_, i) => i !== index));
  }

  function handleAddExperiencia(item: ExperienciaItem) {
    if (experienciaEdit !== null) {
      const updated = [...experiencia];
      updated[experienciaEdit.index] = item;
      saveExperiencia(updated);
    } else {
      saveExperiencia([...experiencia, item]);
    }
    setExperienciaEdit(null);
  }

  function handleDeleteExperiencia(index: number) {
    saveExperiencia(experiencia.filter((_, i) => i !== index));
  }

  async function handleCvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await cvUpload.upload(file);
    if (result) {
      toast.success('CV subido correctamente.');
      void utils.egresados.findOne.invalidate({ id: user?.id });
    } else if (cvUpload.error) {
      toast.error(cvUpload.error);
    }
    e.target.value = '';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
        <p className="text-muted-foreground">Mantén tu información actualizada para mejorar tus oportunidades.</p>
      </div>

      {/* Avatar placeholder */}
      <Card>
        <CardContent className="flex items-center gap-6 pt-6">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-3xl font-bold text-muted-foreground">
              {data?.nombre?.[0]?.toUpperCase() ?? <User className="h-8 w-8" />}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted"
              title="Cambiar foto"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" />
          </div>
          <div>
            <p className="text-lg font-semibold">
              {data?.nombre} {data?.apellido}
            </p>
            <p className="text-sm text-muted-foreground">{data?.carrera ?? 'Sin carrera registrada'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Personal + Academic data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Datos personales y académicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(savePersonal)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-nombre">Nombre</Label>
                <Input id="p-nombre" {...register('nombre')} />
                {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-apellido">Apellido</Label>
                <Input id="p-apellido" {...register('apellido')} />
                {errors.apellido && <p className="text-xs text-destructive">{errors.apellido.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-telefono">Teléfono</Label>
                <Input id="p-telefono" placeholder="+51 999 999 999" {...register('telefono')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-nacimiento">Fecha de nacimiento</Label>
                <Input id="p-nacimiento" type="date" {...register('fechaNacimiento')} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-direccion">Dirección</Label>
                <Input id="p-direccion" placeholder="Av. Ejemplo 123, Lima" {...register('direccion')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-carrera">Carrera</Label>
                <Input id="p-carrera" placeholder="Ingeniería de Sistemas" {...register('carrera')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-anio">Año de egreso</Label>
                <Input id="p-anio" placeholder="2022" maxLength={4} {...register('anioEgreso')} />
                {errors.anioEgreso && <p className="text-xs text-destructive">{errors.anioEgreso.message}</p>}
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

      {/* Formación académica */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4" />
            Formación académica
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { setFormacionEdit(null); setFormacionOpen(true); }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {formacion.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin formación académica registrada.</p>
          ) : (
            formacion.map((f, i) => (
              <div key={i} className="flex items-start justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{f.titulo}</p>
                  <p className="text-sm text-muted-foreground">{f.institucion}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.anioInicio} – {f.anioFin ?? 'Presente'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setFormacionEdit({ item: f, index: i }); setFormacionOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteFormacion(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Experiencia laboral */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4" />
            Experiencia laboral
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { setExperienciaEdit(null); setExperienciaOpen(true); }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {experiencia.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin experiencia laboral registrada.</p>
          ) : (
            experiencia.map((e, i) => (
              <div key={i} className="flex items-start justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{e.cargo}</p>
                  <p className="text-sm text-muted-foreground">{e.empresa}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.anioInicio} – {e.anioFin ?? 'Presente'}
                  </p>
                  {e.descripcion && (
                    <p className="mt-1 text-sm text-muted-foreground">{e.descripcion}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setExperienciaEdit({ item: e, index: i }); setExperienciaOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteExperiencia(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Habilidades */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Habilidades</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setHabilidadesOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {habilidades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin habilidades registradas.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {habilidades.map((h) => (
                <div
                  key={h.habilidadId}
                  className="flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-sm"
                >
                  <span className="font-medium">{h.habilidad.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    · {NIVEL_LABELS[h.nivel as NivelHabilidad] ?? h.nivel}
                  </span>
                  <button
                    type="button"
                    className="ml-1 rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                    title="Eliminar habilidad"
                    onClick={() =>
                      user?.id &&
                      eliminarHabilidadMutation.mutate({
                        egresadoId: user.id,
                        habilidadId: h.habilidadId,
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CV Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Currículum Vitae
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data?.cvUrl ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">CV actual</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`${API_URL}${data.cvUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </a>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No has subido tu CV todavía.</p>
          )}

          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-8 transition-colors hover:border-primary hover:bg-muted/30"
            onClick={() => cvInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && cvInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {cvUpload.uploading ? 'Subiendo…' : 'Haz clic para subir tu CV'}
            </p>
            <p className="text-xs text-muted-foreground">PDF · máx. 5 MB</p>
            {cvUpload.error && (
              <p className="mt-2 text-xs text-destructive">{cvUpload.error}</p>
            )}
          </div>
          <input
            ref={cvInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleCvUpload}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <FormacionAcademicaModal
        open={formacionOpen}
        onClose={() => { setFormacionOpen(false); setFormacionEdit(null); }}
        onSave={handleAddFormacion}
        initial={formacionEdit?.item}
      />
      <ExperienciaLaboralModal
        open={experienciaOpen}
        onClose={() => { setExperienciaOpen(false); setExperienciaEdit(null); }}
        onSave={handleAddExperiencia}
        initial={experienciaEdit?.item}
      />
      <HabilidadesSelector
        open={habilidadesOpen}
        onClose={() => setHabilidadesOpen(false)}
        existingIds={habilidades.map((h) => h.habilidadId)}
        onAdd={(habilidadId, _nombre, nivel) => {
          if (!user?.id) return;
          agregarHabilidadMutation.mutate({
            id: user.id,
            data: { habilidadId, nivel },
          });
        }}
      />
    </div>
  );
}
