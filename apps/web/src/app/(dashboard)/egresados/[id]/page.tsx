'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, BookOpen, Briefcase, GraduationCap, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function EgresadoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data, isLoading, isError } = trpc.egresados.findOne.useQuery(
    { id },
    { enabled: !!id },
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/egresados"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
        </Button>
        <p className="text-sm text-destructive">No se pudo cargar el perfil del egresado.</p>
      </div>
    );
  }

  const egresado = data as typeof data & {
    habilidades: Array<{ habilidadId: string; nivel: string; habilidad: { nombre: string; tipo: string } }>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/egresados"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {egresado.nombre} {egresado.apellido}
          </h1>
          <p className="text-sm text-muted-foreground">DNI: {egresado.dni}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info principal */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4" />
                Información académica
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Carrera</p>
                <p className="font-medium">{egresado.carrera ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Año de egreso</p>
                <p className="font-medium">{egresado.anioEgreso ?? '—'}</p>
              </div>
              {egresado.cvUrl && (
                <div className="sm:col-span-2">
                  <a
                    href={egresado.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Ver CV →
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Habilidades */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                Habilidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              {egresado.habilidades.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin habilidades registradas.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {egresado.habilidades.map((h) => (
                    <Badge key={h.habilidadId} variant="secondary" className="text-xs">
                      {h.habilidad.nombre}
                      <span className="ml-1 opacity-60">· {h.nivel}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formación académica */}
          {Array.isArray(egresado.formacionAcademica) && egresado.formacionAcademica.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4" />
                  Formación académica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(egresado.formacionAcademica as Array<Record<string, string>>).map((f, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <p className="font-medium">{f.titulo ?? f.institucion ?? `Entrada ${i + 1}`}</p>
                    {f.institucion && <p className="text-muted-foreground">{f.institucion}</p>}
                    {f.anio && <p className="text-xs text-muted-foreground">{f.anio}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {egresado.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{egresado.telefono}</span>
                </div>
              )}
              {egresado.direccion && (
                <p className="text-muted-foreground">{egresado.direccion}</p>
              )}
              {!egresado.telefono && !egresado.direccion && (
                <p className="text-muted-foreground">Sin datos de contacto.</p>
              )}
            </CardContent>
          </Card>

          {/* Admin actions */}
          {user?.role === 'ADMIN' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/admin/egresados/${id}`}>Editar perfil</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
