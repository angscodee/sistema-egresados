import { TipoHabilidad, Role } from '@prisma/client';
import { z } from 'zod';
import type { CreateHabilidadDto } from '../../modules/habilidades/dto/create-habilidad.dto';
import type { UpdateHabilidadDto } from '../../modules/habilidades/dto/update-habilidad.dto';
import { router, rolesProcedure, roleProcedure } from '../trpc';
import { withService } from '../trpc-errors';

export const habilidadesRouter = router({
  findAll: rolesProcedure(Role.ADMIN, Role.EGRESADO, Role.EMPRESA)
    .input(z.object({ search: z.string().optional() }).optional())
    .query(({ ctx, input }) =>
      withService(() => ctx.habilidades.findAll(input?.search)),
    ),

  create: roleProcedure(Role.ADMIN)
    .input(
      z.object({
        nombre: z.string().min(1).max(100),
        tipo: z.nativeEnum(TipoHabilidad),
        categoria: z.string().max(100).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      withService(() => ctx.habilidades.create(input as CreateHabilidadDto)),
    ),

  update: roleProcedure(Role.ADMIN)
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          nombre: z.string().min(1).max(100).optional(),
          tipo: z.nativeEnum(TipoHabilidad).optional(),
          categoria: z.string().max(100).nullable().optional(),
        }),
      }),
    )
    .mutation(({ ctx, input }) =>
      withService(() => ctx.habilidades.update(input.id, input.data as UpdateHabilidadDto)),
    ),

  delete: roleProcedure(Role.ADMIN)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      withService(() => ctx.habilidades.delete(input.id)),
    ),
});
