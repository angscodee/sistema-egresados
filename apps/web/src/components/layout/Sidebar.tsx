'use client';

import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/auth-context';
import {
  Briefcase,
  Building2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Search,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const adminNav: NavItem[] = [
  { href: '/admin',              label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/admin/egresados',    label: 'Egresados',      icon: GraduationCap },
  { href: '/admin/empresas',     label: 'Empresas',       icon: Building2 },
  { href: '/ofertas',            label: 'Ofertas',        icon: Briefcase },
  { href: '/reportes',           label: 'Reportes',       icon: FileText },
  { href: '/admin/configuracion',label: 'Configuración',  icon: Settings },
];

const empresaNav: NavItem[] = [
  { href: '/empresa',                  label: 'Mi Dashboard',   icon: LayoutDashboard },
  { href: '/ofertas',                  label: 'Mis Ofertas',    icon: Briefcase },
  { href: '/empresa/postulaciones',    label: 'Postulaciones',  icon: Users },
  { href: '/perfil/empresa',           label: 'Mi Perfil',      icon: UserCircle },
];

const egresadoNav: NavItem[] = [
  { href: '/egresado',                 label: 'Mi Dashboard',      icon: LayoutDashboard },
  { href: '/ofertas',                  label: 'Buscar Ofertas',    icon: Search },
  { href: '/egresado/postulaciones',   label: 'Mis Postulaciones', icon: Users },
  { href: '/perfil/egresado',          label: 'Mi Perfil',         icon: UserCircle },
];

function navForRole(role: UserRole): NavItem[] {
  switch (role) {
    case 'ADMIN':   return adminNav;
    case 'EMPRESA': return empresaNav;
    case 'EGRESADO':return egresadoNav;
    default:        return [];
  }
}

type SidebarProps = {
  role: UserRole;
  className?: string;
};

export function Sidebar({ role, className }: SidebarProps) {
  const pathname = usePathname();
  const items = navForRole(role);

  return (
    <aside
      className={cn(
        'flex w-56 shrink-0 flex-col border-r bg-card py-6 pl-4 pr-2 lg:w-64',
        className,
      )}
    >
      <div className="mb-8 flex items-center gap-2 px-2">
        <Building2 className="h-7 w-7 text-primary" aria-hidden />
        <span className="text-sm font-semibold leading-tight">Gestión Egresados</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Principal">
        {items.map((item) => {
          // Exact match for dashboard roots, prefix match for sub-pages
          const active =
            pathname === item.href ||
            (item.href !== '/ofertas' && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
