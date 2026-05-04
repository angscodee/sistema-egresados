import { EstadoValidacion, Role } from '@prisma/client';
import { z } from 'zod';
import type { FilterEmpresasDto } from '../../modules/empresas/dto/filter-empresas.dto';
import type { RechazarEmpresaDto } from '../../modules/empresas/dto/rechazar-empresa.dto';
import type { UpdateEmpresaDto } from '../../modules/empresas/dto/update-empresa.dto';
import { router, rolesProcedure, roleProcedure } from '../trpc';
import { withService } from '../trpc-errors';

const filterEmpresasSchema = z.object({
  skip: z.number().int().min(0).optional(),
  take: z.number().int().min(1).max(100).optional(),
  estadoValidacion: z.nativeEnum(EstadoValidacion).optional(),
  search: z.string().optional(),
});

const updateEmpresaSchema = z.object({
  nombreComercial: z.string().min(1).max(200).optional(),
  razonSocial: z.string().min(1).max(200).optional(),
  ruc: z.string().min(1).max(20).optional(),
  sector: z.string().max(100).nullable().optional(),
  sitioWeb: z.string().url().nullable().optional(),
  descripcion: z.string().max(2000).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export const empresasRouter = router({
  findAll: roleProcedure(Role.ADMIN)
    .input(filterEmpresasSchema.optional())
    .query(({ ctx, input }) =>
      withService(() => ctx.empresas.findAll((input ?? {}) as FilterEmpresasDto)),
    ),

  findOne: rolesProcedure(Role.ADMIN, Role.EMPRESA)
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => withService(() => ctx.empresas.findOne(input.id))),

  validar: roleProcedure(Role.ADMIN)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => withService(() => ctx.empresas.validar(input.id))),

  rechazar: roleProcedure(Role.ADMIN)
    .input(z.object({ id: z.string().uuid(), motivo: z.string().min(1).max(1000) }))
    .mutation(({ ctx, input }) =>
      withService(() =>
        ctx.empresas.rechazar(input.id, { motivo: input.motivo } as RechazarEmpresaDto),
      ),
    ),

  update: rolesProcedure(Role.ADMIN, Role.EMPRESA)
    .input(z.object({ id: z.string().uuid(), data: updateEmpresaSchema }))
    .mutation(({ ctx, input }) =>
      withService(() =>
        ctx.empresas.update(input.id, input.data as UpdateEmpresaDto, ctx.user.id),
      ),
    ),
});
