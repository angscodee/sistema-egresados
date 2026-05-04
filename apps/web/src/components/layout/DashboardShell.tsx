'use client';

import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

type DashboardShellProps = {
  children: React.ReactNode;
  headerEnd?: ReactNode;
};

export function DashboardShell({ children, headerEnd }: DashboardShellProps) {
  const { user, isReady, clearSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    if (pathname.startsWith('/admin') && user.role !== 'ADMIN') {
      router.replace('/ofertas');
      return;
    }
    if (pathname.startsWith('/empresa') && user.role !== 'EMPRESA') {
      router.replace('/ofertas');
      return;
    }
    if (pathname.startsWith('/egresado') && user.role !== 'EGRESADO') {
      router.replace('/ofertas');
    }
  }, [isReady, user, router, pathname]);

  if (!isReady || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Cargando sesión…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <p className="truncate text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{user.email}</span>
            <span className="mx-2">·</span>
            {user.role}
          </p>
          <div className="flex items-center gap-2">
            {headerEnd}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Inicio</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearSession();
                router.push('/login');
              }}
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
