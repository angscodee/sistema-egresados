import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { withService } from '../trpc-errors';

const generateInput = z.object({
  tipo: z.string().min(1).max(120),
  parametros: z.record(z.string(), z.unknown()).optional(),
});

export const reportesRouter = router({
  generateReport: protectedProcedure
    .input(generateInput)
    .mutation(({ ctx, input }) =>
      withService(() =>
        ctx.reportes.generateReport(ctx.user.id, input.tipo, input.parametros as Prisma.InputJsonValue | undefined),
      ),
    ),

  generateDirect: protectedProcedure
    .input(generateInput)
    .mutation(({ ctx, input }) =>
      withService(() =>
        ctx.reportes.generateDirect(ctx.user.id, input.tipo, input.parametros as Prisma.InputJsonValue | undefined),
      ),
    ),

  getReportStatus: protectedProcedure
    .input(z.object({ reportId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      withService(() => ctx.reportes.obtenerPorId(input.reportId, ctx.user.id, ctx.user.role)),
    ),

  getHistorialReportes: protectedProcedure.query(({ ctx }) =>
    withService(() => ctx.reportes.getHistorialReportes(ctx.user.id)),
  ),

  /** @deprecated Usar `generateReport` */
  generar: protectedProcedure
    .input(generateInput)
    .mutation(({ ctx, input }) =>
      withService(() =>
        ctx.reportes.generateReport(ctx.user.id, input.tipo, input.parametros as Prisma.InputJsonValue | undefined),
      ),
    ),

  /** @deprecated Usar `getHistorialReportes` */
  listar: protectedProcedure.query(({ ctx }) =>
    withService(() => ctx.reportes.getHistorialReportes(ctx.user.id)),
  ),

  /** @deprecated Usar `getReportStatus` */
  obtener: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) =>
      withService(() => ctx.reportes.obtenerPorId(input.id, ctx.user.id, ctx.user.role)),
    ),
});
