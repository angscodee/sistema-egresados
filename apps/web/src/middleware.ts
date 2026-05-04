import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/admin',
  '/egresado',
  '/empresa',
  '/egresados',
  '/ofertas',
  '/reportes',
  '/perfil',
  '/mis-postulaciones',
];

// Public routes that should redirect logged-in users to their dashboard
const AUTH_ROUTES = ['/login', '/register'];

// Role → default landing page after login
const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  EGRESADO: '/egresado',
  EMPRESA: '/empresa',
};

// Role → allowed path prefixes (others get redirected to role home)
const ROLE_ALLOWED: Record<string, string[]> = {
  ADMIN: ['/admin', '/egresados', '/ofertas', '/reportes', '/perfil'],
  EGRESADO: ['/egresado', '/ofertas', '/reportes', '/perfil', '/mis-postulaciones'],
  EMPRESA: ['/empresa', '/egresados', '/ofertas', '/reportes', '/perfil'],
};

function decodeRole(token: string): string | null {
  try {
    // JWT payload is the second base64url segment
    const payload = token.split('.')[1];
    if (!payload) return null;
    // atob is available in the Edge runtime
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded) as { role?: string };
    return parsed.role ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value ?? null;
  const role = token ? decodeRole(token) : null;

  // ── Redirect logged-in users away from auth pages ──────────────────────
  if (AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    if (token && role && ROLE_HOME[role]) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
    return NextResponse.next();
  }

  // ── Check if route needs auth ──────────────────────────────────────────
  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!needsAuth) return NextResponse.next();

  // ── No token → redirect to login ──────────────────────────────────────
  if (!token) {
    const login = new URL('/login', request.url);
    login.searchParams.set('from', pathname);
    return NextResponse.redirect(login);
  }

  // ── Invalid/expired token (no role decoded) → redirect to login ────────
  if (!role) {
    const login = new URL('/login', request.url);
    const res = NextResponse.redirect(login);
    res.cookies.delete('auth_token');
    return res;
  }

  // ── Role-based access control ──────────────────────────────────────────
  const allowed = ROLE_ALLOWED[role] ?? [];
  const isAllowed = allowed.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isAllowed) {
    // Redirect to the role's home page instead of showing 403
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
