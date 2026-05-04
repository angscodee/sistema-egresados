import { initTRPC, TRPCError } from '@trpc/server';
import type { Role } from '@prisma/client';
import type { TrpcContext, TrpcUser } from './context';

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const middleware = t.middleware;

export const publicProcedure = t.procedure;

const isAuthed = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Debe iniciar sesión.' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export type AuthedContext = TrpcContext & { user: TrpcUser };

export const protectedProcedure = t.procedure.use(isAuthed);

export function roleProcedure(...allowed: Role[]) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!allowed.includes(ctx.user.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No tiene permisos para esta operación.' });
    }
    return next({ ctx });
  });
}

/** Igual que `roleProcedure` pero el nombre deja claro que acepta varios roles permitidos. */
export const rolesProcedure = roleProcedure;

export { t };
