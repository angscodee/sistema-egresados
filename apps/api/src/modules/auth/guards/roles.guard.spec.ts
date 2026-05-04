import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '@prisma/client';

function makeContext(role: Role | null) {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: role ? { id: 'user-1', email: 'test@test.com', role } : undefined,
      }),
    }),
  } as never;
}

describe('RolesGuard', () => {
  it('permite el acceso cuando no hay roles requeridos (ruta pública)', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) } as never;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext(Role.EGRESADO))).toBe(true);
  });

  it('bloquea el acceso cuando el usuario no tiene el rol correcto', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Role.ADMIN]),
    } as never;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(makeContext(Role.EGRESADO))).toThrow(ForbiddenException);
  });

  it('permite el acceso cuando el usuario tiene el rol correcto', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Role.ADMIN]),
    } as never;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext(Role.ADMIN))).toBe(true);
  });

  it('permite el acceso cuando el rol está en una lista de roles permitidos', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Role.ADMIN, Role.EMPRESA]),
    } as never;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext(Role.EMPRESA))).toBe(true);
  });

  it('bloquea el acceso cuando no hay usuario autenticado', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([Role.ADMIN]),
    } as never;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(makeContext(null))).toThrow(ForbiddenException);
  });
});
