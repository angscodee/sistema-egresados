import { TRPCError } from '@trpc/server';
import { NivelHabilidad, Role } from '@prisma/client';
import { z } from 'zod';
import type { CreateEgresadoDto } from '../../modules/egresados/dto/create-egresado.dto';
import type { UpdateEgresadoDto } from '../../modules/egresados/dto/update-egresado.dto';
import { router, rolesProcedure, roleProcedure } from '../trpc';
import { withService } from '../trpc-errors';

const createEgresadoSchema = z.object({
  nombre: z.string().min(1).max(120),
  apellido: z.string().min(1).max(120),
  dni: z.string().min(6).max(20),
  fechaNacimiento: z.coerce.date().optional(),
  telefono: z.string().max(40).optional(),
  direccion: z.string().max(500).optional(),
  carrera: z.string().max(200).optional(),
  anioEgreso: z.number().int().min(1950).optional(),
  cvUrl: z.string().url().optional(),
  formacionAcademica: z.array(z.unknown()).optional(),
  experienciaLaboral: z.array(z.unknown()).optional(),
});

const updateEgresadoSchema = z.object({
  nombre: z.string().min(1).max(120).optional(),
  apellido: z.string().min(1).max(120).optional(),
  dni: z.string().min(6).max(20).optional(),
  fechaNacimiento: z.coerce.date().nullable().optional(),
  telefono: z.string().max(40).nullable().optional(),
  direccion: z.string().max(500).nullable().optional(),
  carrera: z.string().max(200).nullable().optional(),
  anioEgreso: z.number().int().min(1950).nullable().optional(),
  cvUrl: z.string().url().nullable().optional(),
  formacionAcademica: z.array(z.unknown()).optional(),
  experienciaLaboral: z.array(z.unknown()).optional(),
});

const filterEgresadosSchema = z.object({
  skip: z.number().int().min(0).optional(),
  take: z.number().int().min(1).max(100).optional(),
  carrera: z.string().optional(),
  anioEgreso: z.number().int().optional(),
  habilidades: z.array(z.string().uuid()).optional(),
});

const buscarEgresadosSchema = z.object({
  cursor: z.string().uuid().optional(),
  take: z.number().int().min(1).max(100).optional(),
  carrera: z.string().optional(),
  anioEgreso: z.number().int().optional(),
  habilidades: z.array(z.string().uuid()).optional(),
  search: z.string().optional(),
});

const agregarHabilidadSchema = z.object({
  habilidadId: z.string().uuid(),
  nivel: z.nativeEnum(NivelHabilidad),
});

export const egresadosRouter = router({
  create: roleProcedure(Role.EGRESADO)
    .input(createEgresadoSchema)
    .mutation(({ ctx, input }) =>
      withService(() => ctx.egresados.create(ctx.user.id, input as CreateEgresadoDto)),
    ),

  findAll: rolesProcedure(Role.ADMIN, Role.EMPRESA, Role.EGRESADO)
    .input(filterEgresadosSchema.optional())
    .query(({ ctx, input }) => withService(() => ctx.egresados.findAll(input ?? {}))),

  buscarConFiltros: roleProcedure(Role.ADMIN)
    .input(buscarEgresadosSchema.optional())
    .query(({ ctx, input }) => withService(() => ctx.egresados.buscarConFiltros(input ?? {}))),

  findOne: rolesProcedure(Role.ADMIN, Role.EMPRESA, Role.EGRESADO)
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => withService(() => ctx.egresados.findOne(input.id))),

  update: rolesProcedure(Role.ADMIN, Role.EGRESADO)
    .input(z.object({ id: z.string().uuid(), data: updateEgresadoSchema }))
    .mutation(({ ctx, input }) =>
      withService(() => ctx.egresados.update(input.id, input.data as UpdateEgresadoDto, ctx.user)),
    ),

  delete: roleProcedure(Role.ADMIN)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => withService(() => ctx.egresados.delete(input.id))),

  agregarHabilidad: rolesProcedure(Role.ADMIN, Role.EGRESADO)
    .input(z.object({ id: z.string().uuid(), data: agregarHabilidadSchema }))
    .mutation(({ ctx, input }) =>
      withService(() =>
        ctx.egresados.agregarHabilidad(
          input.id,
          input.data.habilidadId,
          input.data.nivel,
          ctx.user,
        ),
      ),
    ),

  estadisticas: rolesProcedure(Role.ADMIN, Role.EGRESADO)
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => {
      if (ctx.user.role !== Role.ADMIN && ctx.user.id !== input.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Solo puede consultar sus propias estadísticas.',
        });
      }
      return withService(() => ctx.egresados.obtenerEstadisticas(input.id));
    }),

  eliminarHabilidad: rolesProcedure(Role.ADMIN, Role.EGRESADO)
    .input(z.object({ egresadoId: z.string().uuid(), habilidadId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      withService(() =>
        ctx.egresados.eliminarHabilidad(input.egresadoId, input.habilidadId, ctx.user),
      ),
    ),

  listarHabilidades: rolesProcedure(Role.ADMIN, Role.EGRESADO, Role.EMPRESA)
    .input(z.object({ search: z.string().optional() }).optional())
    .query(({ ctx, input }) =>
      withService(() => ctx.egresados.listarHabilidades(input?.search)),
    ),
});
