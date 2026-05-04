import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoPostulacion, NivelHabilidad, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEgresadoDto } from './dto/create-egresado.dto';
import { FilterEgresadosDto } from './dto/filter-egresados.dto';
import { UpdateEgresadoDto } from './dto/update-egresado.dto';

export type BuscarEgresadosFiltros = {
  cursor?: string;
  take?: number;
  carrera?: string;
  anioEgreso?: number;
  habilidades?: string[];
  search?: string;
};

@Injectable()
export class EgresadosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateEgresadoDto) {
    const existingProfile = await this.prisma.egresado.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (existingProfile) {
      throw new ConflictException('Ya existe un perfil de egresado para este usuario.');
    }

    const dniTaken = await this.prisma.egresado.findUnique({
      where: { dni: dto.dni.trim() },
      select: { id: true },
    });

    if (dniTaken) {
      throw new ConflictException('El DNI ya está registrado en otro perfil.');
    }

    return this.prisma.egresado.create({
      data: {
        id: userId,
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        dni: dto.dni.trim(),
        fechaNacimiento: dto.fechaNacimiento,
        telefono: dto.telefono?.trim(),
        direccion: dto.direccion?.trim(),
        carrera: dto.carrera?.trim(),
        anioEgreso: dto.anioEgreso,
        cvUrl: dto.cvUrl?.trim(),
        formacionAcademica: (dto.formacionAcademica ?? []) as Prisma.InputJsonValue,
        experienciaLaboral: (dto.experienciaLaboral ?? []) as Prisma.InputJsonValue,
      },
    });
  }

  async findAll(filters: FilterEgresadosDto) {
    const skip = filters.skip ?? 0;
    const take = filters.take ?? 20;

    const where: Prisma.EgresadoWhereInput = {};

    if (filters.carrera?.trim()) {
      where.carrera = { contains: filters.carrera.trim(), mode: 'insensitive' };
    }

    if (filters.anioEgreso !== undefined) {
      where.anioEgreso = filters.anioEgreso;
    }

    if (filters.habilidades && filters.habilidades.length > 0) {
      where.AND = filters.habilidades.map((habilidadId) => ({
        habilidades: { some: { habilidadId } },
      }));
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.egresado.findMany({
        where,
        skip,
        take,
        orderBy: { nombre: 'asc' },
        include: {
          habilidades: { include: { habilidad: true } },
        },
      }),
      this.prisma.egresado.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async findOne(id: string) {
    const egresado = await this.prisma.egresado.findUnique({
      where: { id },
      include: {
        habilidades: { include: { habilidad: true } },
        postulaciones: {
          include: {
            oferta: {
              select: {
                id: true,
                titulo: true,
                estado: true,
                empresaId: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!egresado) {
      throw new NotFoundException('No se encontró el egresado indicado.');
    }

    return egresado;
  }

  async update(id: string, dto: UpdateEgresadoDto, currentUser: Express.User) {
    await this.ensureCanEditEgresado(id, currentUser);

    if (dto.dni) {
      const dniTaken = await this.prisma.egresado.findFirst({
        where: { dni: dto.dni.trim(), NOT: { id } },
        select: { id: true },
      });
      if (dniTaken) {
        throw new ConflictException('El DNI ya está registrado en otro perfil.');
      }
    }

    const data: Prisma.EgresadoUpdateInput = {};

    if (dto.nombre !== undefined) data.nombre = dto.nombre.trim();
    if (dto.apellido !== undefined) data.apellido = dto.apellido.trim();
    if (dto.dni !== undefined) data.dni = dto.dni.trim();
    if (dto.fechaNacimiento !== undefined) data.fechaNacimiento = dto.fechaNacimiento;
    if (dto.telefono !== undefined) data.telefono = dto.telefono?.trim() ?? null;
    if (dto.direccion !== undefined) data.direccion = dto.direccion?.trim() ?? null;
    if (dto.carrera !== undefined) data.carrera = dto.carrera?.trim() ?? null;
    if (dto.anioEgreso !== undefined) data.anioEgreso = dto.anioEgreso;
    if (dto.cvUrl !== undefined) data.cvUrl = dto.cvUrl?.trim() ?? null;
    if (dto.formacionAcademica !== undefined) {
      data.formacionAcademica = dto.formacionAcademica as Prisma.InputJsonValue;
    }
    if (dto.experienciaLaboral !== undefined) {
      data.experienciaLaboral = dto.experienciaLaboral as Prisma.InputJsonValue;
    }

    return this.prisma.egresado.update({
      where: { id },
      data,
    });
  }

  async agregarHabilidad(
    egresadoId: string,
    habilidadId: string,
    nivel: NivelHabilidad,
    currentUser: Express.User,
  ) {
    await this.ensureCanEditEgresado(egresadoId, currentUser);

    const egresado = await this.prisma.egresado.findUnique({
      where: { id: egresadoId },
      select: { id: true },
    });
    if (!egresado) {
      throw new NotFoundException('No se encontró el egresado indicado.');
    }

    const habilidad = await this.prisma.habilidad.findUnique({
      where: { id: habilidadId },
      select: { id: true },
    });
    if (!habilidad) {
      throw new NotFoundException('No se encontró la habilidad indicada.');
    }

    return this.prisma.egresadoHabilidad.upsert({
      where: {
        egresadoId_habilidadId: { egresadoId, habilidadId },
      },
      create: {
        egresadoId,
        habilidadId,
        nivel,
      },
      update: { nivel },
      include: { habilidad: true },
    });
  }

  async obtenerEstadisticas(id: string) {
    const exists = await this.prisma.egresado.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('No se encontró el egresado indicado.');
    }

    const totalPostulaciones = await this.prisma.postulacion.count({
      where: { egresadoId: id },
    });

    const conRespuesta = await this.prisma.postulacion.count({
      where: {
        egresadoId: id,
        estado: { not: EstadoPostulacion.POSTULADO },
      },
    });

    const tasaRespuesta =
      totalPostulaciones === 0
        ? 0
        : Math.round((conRespuesta / totalPostulaciones) * 10000) / 100;

    return { totalPostulaciones, tasaRespuesta };
  }

  async updateCvUrl(id: string, filename: string, currentUser: Express.User) {
    await this.ensureCanEditEgresado(id, currentUser);
    const cvUrl = `/static/cvs/${filename}`;
    return this.prisma.egresado.update({
      where: { id },
      data: { cvUrl },
      select: { id: true, cvUrl: true },
    });
  }

  async eliminarHabilidad(egresadoId: string, habilidadId: string, currentUser: Express.User) {
    await this.ensureCanEditEgresado(egresadoId, currentUser);
    await this.prisma.egresadoHabilidad.delete({
      where: { egresadoId_habilidadId: { egresadoId, habilidadId } },
    });
    return { deleted: true };
  }

  async listarHabilidades(search?: string) {
    const where = search?.trim()
      ? { nombre: { contains: search.trim(), mode: 'insensitive' as const } }
      : {};
    return this.prisma.habilidad.findMany({
      where,
      orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }],
      take: 100,
    });
  }

  async delete(id: string) {
    const egresado = await this.prisma.egresado.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!egresado) {
      throw new NotFoundException('No se encontró el egresado indicado.');
    }
    // Cascade deletes the User row which cascades to Egresado
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  async buscarConFiltros(filtros: BuscarEgresadosFiltros) {
    const take = filtros.take ?? 20;

    const where: Prisma.EgresadoWhereInput = {};

    if (filtros.carrera?.trim()) {
      where.carrera = { contains: filtros.carrera.trim(), mode: 'insensitive' };
    }

    if (filtros.anioEgreso !== undefined) {
      where.anioEgreso = filtros.anioEgreso;
    }

    if (filtros.habilidades && filtros.habilidades.length > 0) {
      where.AND = filtros.habilidades.map((habilidadId) => ({
        habilidades: { some: { habilidadId } },
      }));
    }

    if (filtros.search?.trim()) {
      const term = filtros.search.trim();
      const searchConditions: Prisma.EgresadoWhereInput = {
        OR: [
          { nombre: { contains: term, mode: 'insensitive' } },
          { apellido: { contains: term, mode: 'insensitive' } },
          { user: { email: { contains: term, mode: 'insensitive' } } },
        ],
      };
      if (where.AND) {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : [where.AND]),
          searchConditions,
        ];
      } else {
        Object.assign(where, searchConditions);
      }
    }

    const baseQuery = {
      where,
      take: take + 1,
      orderBy: [{ nombre: 'asc' as const }, { id: 'asc' as const }],
      include: {
        habilidades: { include: { habilidad: true } },
        user: { select: { email: true } },
      },
    };

    const items = filtros.cursor
      ? await this.prisma.egresado.findMany({
          ...baseQuery,
          cursor: { id: filtros.cursor },
          skip: 1,
        })
      : await this.prisma.egresado.findMany(baseQuery);

    const hasNextPage = items.length > take;
    const data = hasNextPage ? items.slice(0, take) : items;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return { items: data, nextCursor, hasNextPage };
  }

  private async ensureCanEditEgresado(egresadoId: string, currentUser: Express.User) {
    if (currentUser.role === Role.ADMIN) {
      return;
    }
    if (currentUser.role === Role.EGRESADO && currentUser.id === egresadoId) {
      return;
    }
    throw new ForbiddenException('No tiene permiso para modificar este perfil de egresado.');
  }
}
