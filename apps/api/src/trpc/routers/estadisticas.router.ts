import { TRPCError } from '@trpc/server';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { router, protectedProcedure, roleProcedure } from '../trpc';

const rangoFechasSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .optional();

export const estadisticasRouter = router({
  adminDashboard: roleProcedure(Role.ADMIN)
    .input(rangoFechasSchema)
    .query(({ ctx, input }) => ctx.estadisticas.getAdminDashboard(input ?? {})),

  egresadoDashboard: protectedProcedure
    .input(z.object({ egresadoId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      if (ctx.user.role === Role.ADMIN || (ctx.user.role === Role.EGRESADO && ctx.user.id === input.egresadoId)) {
        return ctx.estadisticas.getEgresadoDashboard(input.egresadoId);
      }
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No tiene permiso para ver este panel de egresado.',
      });
    }),

  empresaDashboard: protectedProcedure
    .input(
      z.object({
        empresaId: z.string().uuid(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }),
    )
    .query(({ ctx, input }) => {
      const { empresaId, startDate, endDate } = input;
      if (ctx.user.role === Role.ADMIN || (ctx.user.role === Role.EMPRESA && ctx.user.id === empresaId)) {
        return ctx.estadisticas.getEmpresaDashboard(empresaId, { startDate, endDate });
      }
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No tiene permiso para ver este panel de empresa.',
      });
    }),
});
