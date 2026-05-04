import { EstadoOferta, Modalidad, Role, TipoContrato } from '@prisma/client';
import { z } from 'zod';
import type { CreateOfertaDto } from '../../modules/ofertas/dto/create-oferta.dto';
import type { UpdateOfertaDto } from '../../modules/ofertas/dto/update-oferta.dto';
import { router, rolesProcedure, roleProcedure } from '../trpc';
import { withService } from '../trpc-errors';

const ofertaHabilidadItemSchema = z.object({
  habilidadId: z.string().uuid(),
  requerido: z.boolean().optional(),
});

const createOfertaSchema = z.object({
  titulo: z.string().min(1).max(200),
  descripcion: z.string().min(1).max(20000),
  ubicacion: z.string().max(200).optional(),
  modalidad: z.nativeEnum(Modalidad),
  tipoContrato: z.nativeEnum(TipoContrato),
  salarioMin: z.number().min(0).optional(),
  salarioMax: z.number().min(0).optional(),
  fechaCierre: z.coerce.date().optional(),
  habilidades: z.array(ofertaHabilidadItemSchema).optional(),
});

const updateOfertaSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  descripcion: z.string().min(1).max(20000).optional(),
  ubicacion: z.string().max(200).nullable().optional(),
  modalidad: z.nativeEnum(Modalidad).optional(),
  tipoContrato: z.nativeEnum(TipoContrato).optional(),
  salarioMin: z.number().min(0).nullable().optional(),
  salarioMax: z.number().min(0).nullable().optional(),
  fechaCierre: z.coerce.date().nullable().optional(),
});

const filterOfertasSchema = z.object({
  skip: z.number().int().min(0).optional(),
  take: z.number().int().min(1).max(100).optional(),
  modalidad: z.nativeEnum(Modalidad).optional(),
  tipoContrato: z.nativeEnum(TipoContrato).optional(),
  salarioMin: z.number().min(0).optional(),
  salarioMax: z.number().min(0).optional(),
  ubicacion: z.string().optional(),
  habilidades: z.array(z.string().uuid()).optional(),
});

export const ofertasRouter = router({
  create: roleProcedure(Role.EMPRESA)
    .input(createOfertaSchema)
    .mutation(({ ctx, input }) =>
      withService(() => ctx.ofertas.create(ctx.user.id, input as CreateOfertaDto)),
    ),

  findAll: rolesProcedure(Role.ADMIN, Role.EMPRESA, Role.EGRESADO)
    .input(filterOfertasSchema.optional())
    .query(({ ctx, input }) => withService(() => ctx.ofertas.findAll(input ?? {}))),

  findOne: rolesProcedure(Role.ADMIN, Role.EMPRESA, Role.EGRESADO)
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => withService(() => ctx.ofertas.findOne(input.id))),

  update: rolesProcedure(Role.EMPRESA, Role.ADMIN)
    .input(z.object({ id: z.string().uuid(), data: updateOfertaSchema }))
    .mutation(({ ctx, input }) =>
      withService(() => ctx.ofertas.update(input.id, input.data as UpdateOfertaDto, ctx.user.id, ctx.user.role)),
    ),

  cambiarEstado: roleProcedure(Role.ADMIN)
    .input(z.object({ id: z.string().uuid(), estado: z.nativeEnum(EstadoOferta) }))
    .mutation(({ ctx, input }) =>
      withService(() => ctx.ofertas.cambiarEstadoAdmin(input.id, input.estado)),
    ),

  delete: rolesProcedure(Role.EMPRESA, Role.ADMIN)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      withService(() => ctx.ofertas.delete(input.id, ctx.user.id, ctx.user.role)),
    ),

  cerrar: roleProcedure(Role.EMPRESA)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => withService(() => ctx.ofertas.cerrar(input.id, ctx.user.id))),

  getMisOfertas: roleProcedure(Role.EMPRESA).query(({ ctx }) =>
    withService(() => ctx.ofertas.getMisOfertas(ctx.user.id)),
  ),
});
