'use client';

import Link from 'next/link';
import { useState } from 'react';
import { APP_NAME } from '@egresados/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function HomePage() {
  const [show, setShow] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-16">
      <Card className="w-full max-w-lg shadow-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
          <CardDescription>Acceda al panel según su perfil o cree una cuenta nueva.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/register">Registrarse</Link>
            </Button>
          </div>

          <div className="rounded-lg border border-dashed">
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Credenciales de demo</span>
              {show ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {show && (
              <div className="border-t px-4 pb-4 pt-3 space-y-1.5 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Admin</span>
                  <span>admin@example.com · password123</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Empresa</span>
                  <span>empresa@example.com · password123</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Egresado</span>
                  <span>egresado@example.com · password123</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
