'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth, type UserRole } from '@/lib/auth-context';
import { getApiUrl } from '@/lib/api-url';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { APP_NAME } from '@egresados/shared';

const loginSchema = z.object({
  email: z.string().email('Correo no válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function homeForRole(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'EMPRESA':
      return '/empresa';
    case 'EGRESADO':
      return '/egresado';
    default:
      return '/ofertas';
  }
}

const DEMO_CREDENTIALS = [
  { rol: 'Admin', email: 'admin@example.com', password: 'password123', color: 'bg-violet-50 border-violet-200 hover:bg-violet-100' },
  { rol: 'Empresa', email: 'empresa@example.com', password: 'password123', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { rol: 'Egresado', email: 'egresado@example.com', password: 'password123', color: 'bg-green-50 border-green-200 hover:bg-green-100' },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    setError(null);
    const res = await fetch(`${getApiUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
      const msg = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
      setError(msg ?? 'Credenciales inválidas.');
      return;
    }
    const json = (await res.json()) as {
      accessToken: string;
      user: { id: string; email: string; role: UserRole };
    };
    setSession(json.user, json.accessToken);
    const dest = params.get('from') || homeForRole(json.user.role);
    router.push(dest);
    router.refresh();
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>{APP_NAME}</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </Button>
            <Button type="button" variant="link" className="px-0" asChild>
              <Link href="/register">Crear cuenta</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Demo credentials */}
      <Card className="border-dashed">
        <button
          type="button"
          onClick={() => setShowDemo((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Credenciales de demo</span>
          {showDemo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showDemo && (
          <CardContent className="grid gap-2 pt-0">
            {DEMO_CREDENTIALS.map((c) => (
              <button
                key={c.rol}
                type="button"
                onClick={() => {
                  setValue('email', c.email);
                  setValue('password', c.password);
                }}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${c.color}`}
              >
                <span className="font-medium">{c.rol}</span>
                <span className="text-xs text-muted-foreground">{c.email}</span>
              </button>
            ))}
            <p className="pt-1 text-center text-xs text-muted-foreground">
              Contraseña: <span className="font-mono font-medium">password123</span>
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
