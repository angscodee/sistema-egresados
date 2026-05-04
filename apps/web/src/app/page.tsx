import Link from 'next/link';
import { APP_NAME } from '@egresados/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-16">
      <Card className="w-full max-w-lg text-center shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
          <CardDescription>Acceda al panel según su perfil o cree una cuenta nueva.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/register">Registrarse</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
