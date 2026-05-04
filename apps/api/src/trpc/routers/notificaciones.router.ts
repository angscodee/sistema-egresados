import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const notificacionesRouter = router({
  mis: protectedProcedure.query(({ ctx }) => ctx.notificaciones.getMisNotificaciones(ctx.user.id)),

  marcarLeida: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => ctx.notificaciones.marcarLeida(input.id, ctx.user.id)),

  marcarTodasLeidas: protectedProcedure.mutation(({ ctx }) =>
    ctx.notificaciones.marcarTodasLeidas(ctx.user.id),
  ),
});
