import { EstadoPostulacion, Role } from '@prisma/client';
import { z } from 'zod';
import { router, rolesProcedure, roleProcedure } from '../trpc';
import { withService } from '../trpc-errors';

export const postulacionesRouter = router({
  postular: roleProcedure(Role.EGRESADO)
    .input(z.object({ ofertaId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      withService(() => ctx.postulaciones.postular(ctx.user.id, input.ofertaId)),
    ),

  getMisPostulaciones: roleProcedure(Role.EGRESADO).query(({ ctx }) =>
    withService(() => ctx.postulaciones.getMisPostulaciones(ctx.user.id)),
  ),

  getPostulacionDetalle: rolesProcedure(Role.EGRESADO, Role.EMPRESA, Role.ADMIN)
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) =>
      withService(() => ctx.postulaciones.getPostulacionDetalle(input.id, ctx.user.id)),
    ),

  getPostulantesPorOferta: roleProcedure(Role.EMPRESA)
    .input(z.object({ ofertaId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      withService(() => ctx.postulaciones.getPostulantesPorOferta(input.ofertaId, ctx.user.id)),
    ),

  calcularMatch: rolesProcedure(Role.EMPRESA, Role.ADMIN)
    .input(z.object({ egresadoId: z.string().uuid(), ofertaId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      withService(() => ctx.postulaciones.calcularMatchHabilidades(input.egresadoId, input.ofertaId)),
    ),

  cambiarEstado: rolesProcedure(Role.ADMIN, Role.EMPRESA)
    .input(
      z.object({
        id: z.string().uuid(),
        nuevoEstado: z.nativeEnum(EstadoPostulacion),
        motivo: z.string().max(2000).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      withService(() =>
        ctx.postulaciones.cambiarEstado(input.id, input.nuevoEstado, ctx.user, input.motivo),
      ),
    ),
});
