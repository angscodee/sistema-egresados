'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import {
  ArrowLeft,
  Briefcase,
  Download,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const ESTADO_LABELS: Record<string, string> = {
  POSTULADO: 'Postulado',
  EN_REVISION: 'En revisión',
  ENTREVISTA: 'Entrevista',
  CONTRATADO: 'Contratado',
  RECHAZADO: 'Rechazado',
};

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  POSTULADO: 'secondary',
  EN_REVISION: 'outline',
  ENTREVISTA: 'default',
  CONTRATADO: 'default',
  RECHAZADO: 'destructive',
};

const NIVEL_LABELS: Record<string, string> = {
  BASICO: 'Básico',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
  EXPERTO: 'Experto',
};

type FormacionItem = {
  institucion?: string;
  titulo?: string;
  anioInicio?: number;
  anioFin?: number;
};

type ExperienciaItem = {
  empresa?: string;
  cargo?: string;
  anioInicio?: number;
  anioFin?: number;
  descripcion?: string;
};

export default function AdminEgresadoDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data, isLoading, isError } = trpc.egresados.findOne.useQuery(
    { id },
    { enabled: !!id },
  );

  if (user?.role !== 'ADMIN') return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/egresados">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <p className="text-sm text-destructive">No se pudo cargar el perfil del egresado.</p>
      </div>
    );
  }

  const formacion = (data.formacionAcademica ?? []) as FormacionItem[];
  const experiencia = (data.experienciaLaboral ?? []) as ExperienciaItem[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/egresados">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {data.nombre} {data.apellido}
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.carrera ?? 'Sin carrera'} · {data.anioEgreso ?? 'Sin año de egreso'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {data.cvUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={data.cvUrl} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Descargar CV
              </a>
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href={`/admin/egresados/${id}?edit=1`}>Editar</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Personal info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Información personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="break-all">{(data as { user?: { email?: string } }).user?.email ?? '—'}</span>
              </div>
              {data.telefono && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{data.telefono}</span>
                </div>
              )}
              {data.direccion && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{data.direccion}</span>
                </div>
              )}
              <div className="pt-1">
                <span className="text-muted-foreground">DNI: </span>
                <span className="font-medium">{data.dni}</span>
              </div>
              {data.fechaNacimiento && (
                <div>
                  <span className="text-muted-foreground">Nacimiento: </span>
                  <span>{new Date(data.fechaNacimiento).toLocaleDateString('es-PE')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Habilidades</CardTitle>
            </CardHeader>
            <CardContent>
              {data.habilidades.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin habilidades registradas.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.habilidades.map((h) => (
                    <div key={h.habilidadId} className="flex flex-col items-start gap-0.5">
                      <Badge variant="secondary">{h.habilidad.nombre}</Badge>
                      <span className="pl-1 text-xs text-muted-foreground">
                        {NIVEL_LABELS[h.nivel] ?? h.nivel}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Academic formation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4" />
                Formación académica
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formacion.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin formación académica registrada.</p>
              ) : (
                <div className="space-y-3">
                  {formacion.map((f, i) => (
                    <div key={i} className="rounded-md border p-3">
                      <p className="font-medium">{f.titulo ?? '—'}</p>
                      <p className="text-sm text-muted-foreground">{f.institucion ?? '—'}</p>
                      {(f.anioInicio || f.anioFin) && (
                        <p className="text-xs text-muted-foreground">
                          {f.anioInicio ?? '?'} – {f.anioFin ?? 'Presente'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work experience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Experiencia laboral
              </CardTitle>
            </CardHeader>
            <CardContent>
              {experiencia.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin experiencia laboral registrada.</p>
              ) : (
                <div className="space-y-3">
                  {experiencia.map((e, i) => (
                    <div key={i} className="rounded-md border p-3">
                      <p className="font-medium">{e.cargo ?? '—'}</p>
                      <p className="text-sm text-muted-foreground">{e.empresa ?? '—'}</p>
                      {(e.anioInicio || e.anioFin) && (
                        <p className="text-xs text-muted-foreground">
                          {e.anioInicio ?? '?'} – {e.anioFin ?? 'Presente'}
                        </p>
                      )}
                      {e.descripcion && (
                        <p className="mt-1 text-sm text-muted-foreground">{e.descripcion}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Application history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de postulaciones</CardTitle>
            </CardHeader>
            <CardContent>
              {data.postulaciones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin postulaciones registradas.</p>
              ) : (
                <div className="space-y-2">
                  {data.postulaciones.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">{p.oferta.titulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString('es-PE')}
                        </p>
                      </div>
                      <Badge variant={ESTADO_VARIANT[p.estado] ?? 'outline'}>
                        {ESTADO_LABELS[p.estado] ?? p.estado}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
