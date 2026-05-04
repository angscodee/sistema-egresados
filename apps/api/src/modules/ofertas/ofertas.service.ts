import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoOferta, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOfertaDto } from './dto/create-oferta.dto';
import { FilterOfertasDto } from './dto/filter-ofertas.dto';
import { UpdateOfertaDto } from './dto/update-oferta.dto';

@Injectable()
export class OfertasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, dto: CreateOfertaDto) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true },
    });
    if (!empresa) {
      throw new NotFoundException('No se encontró el perfil de empresa asociado al usuario.');
    }

    // Validate salary range
    if (
      dto.salarioMin !== undefined &&
      dto.salarioMax !== undefined &&
      dto.salarioMin > dto.salarioMax
    ) {
      throw new BadRequestException('El salario mínimo no puede ser mayor que el salario máximo.');
    }

    if (dto.habilidades?.length) {
      const ids = [...new Set(dto.habilidades.map((h) => h.habilidadId))];
      const count = await this.prisma.habilidad.count({ where: { id: { in: ids } } });
      if (count !== ids.length) {
        throw new BadRequestException('Una o más habilidades indicadas no existen.');
      }
    }

    return this.prisma.ofertaLaboral.create({
      data: {
        empresaId,
        titulo: dto.titulo.trim(),
        descripcion: dto.descripcion.trim(),
        ubicacion: dto.ubicacion?.trim(),
        modalidad: dto.modalidad,
        tipoContrato: dto.tipoContrato,
        salarioMin: dto.salarioMin,
        salarioMax: dto.salarioMax,
        fechaCierre: dto.fechaCierre,
        habilidades: dto.habilidades?.length
          ? {
              create: dto.habilidades.map((h) => ({
                habilidadId: h.habilidadId,
                requerido: h.requerido ?? true,
              })),
            }
          : undefined,
      },
      include: {
        empresa: true,
        habilidades: { include: { habilidad: true } },
      },
    });
  }

  async getMisOfertas(empresaId: string) {
    return this.prisma.ofertaLaboral.findMany({
      where: { empresaId },
      orderBy: { fechaPublicacion: 'desc' },
      select: {
        id: true,
        titulo: true,
        estado: true,
        fechaPublicacion: true,
        _count: { select: { postulaciones: true } },
      },
    });
  }

  async findAll(filters: FilterOfertasDto) {
    const skip = filters.skip ?? 0;
    const take = filters.take ?? 20;

    const where: Prisma.OfertaLaboralWhereInput = {};

    if (filters.modalidad) {
      where.modalidad = filters.modalidad;
    }
    if (filters.tipoContrato) {
      where.tipoContrato = filters.tipoContrato;
    }
    if (filters.ubicacion?.trim()) {
      where.ubicacion = { contains: filters.ubicacion.trim(), mode: 'insensitive' };
    }
    if (filters.salarioMin !== undefined) {
      where.salarioMin = { gte: filters.salarioMin };
    }
    if (filters.salarioMax !== undefined) {
      where.salarioMax = { lte: filters.salarioMax };
    }
    if (filters.habilidades && filters.habilidades.length > 0) {
      where.AND = filters.habilidades.map((habilidadId) => ({
        habilidades: { some: { habilidadId } },
      }));
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ofertaLaboral.findMany({
        where,
        skip,
        take,
        orderBy: { fechaPublicacion: 'desc' },
        include: {
          empresa: { select: { id: true, nombreComercial: true, logoUrl: true } },
          habilidades: { include: { habilidad: true } },
        },
      }),
      this.prisma.ofertaLaboral.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async findOne(id: string) {
    const oferta = await this.prisma.ofertaLaboral.findUnique({
      where: { id },
      include: {
        empresa: true,
        habilidades: { include: { habilidad: true } },
      },
    });

    if (!oferta) {
      throw new NotFoundException('No se encontró la oferta indicada.');
    }

    return oferta;
  }

  async update(id: string, dto: UpdateOfertaDto, requesterId: string, requesterRole?: Role) {
    // ADMIN can edit any offer; EMPRESA can only edit their own
    if (requesterRole !== Role.ADMIN) {
      await this.ensureEmpresaOwnsOferta(id, requesterId);
    } else {
      const exists = await this.prisma.ofertaLaboral.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw new NotFoundException('No se encontró la oferta indicada.');
    }

    // Validate salary range
    if (
      dto.salarioMin !== undefined &&
      dto.salarioMin !== null &&
      dto.salarioMax !== undefined &&
      dto.salarioMax !== null &&
      dto.salarioMin > dto.salarioMax
    ) {
      throw new BadRequestException('El salario mínimo no puede ser mayor que el salario máximo.');
    }

    const data: Prisma.OfertaLaboralUpdateInput = {};

    if (dto.titulo !== undefined) data.titulo = dto.titulo.trim();
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion.trim();
    if (dto.ubicacion !== undefined) data.ubicacion = dto.ubicacion?.trim() ?? null;
    if (dto.modalidad !== undefined) data.modalidad = dto.modalidad;
    if (dto.tipoContrato !== undefined) data.tipoContrato = dto.tipoContrato;
    if (dto.salarioMin !== undefined) data.salarioMin = dto.salarioMin;
    if (dto.salarioMax !== undefined) data.salarioMax = dto.salarioMax;
    if (dto.fechaCierre !== undefined) data.fechaCierre = dto.fechaCierre;

    return this.prisma.ofertaLaboral.update({
      where: { id },
      data,
      include: {
        empresa: true,
        habilidades: { include: { habilidad: true } },
      },
    });
  }

  async cerrar(id: string, empresaId: string) {
    await this.ensureEmpresaOwnsOferta(id, empresaId);

    return this.prisma.ofertaLaboral.update({
      where: { id },
      data: { estado: EstadoOferta.CERRADA },
      include: {
        empresa: { select: { id: true, nombreComercial: true } },
        habilidades: { include: { habilidad: true } },
      },
    });
  }

  /** Admin-only: set any estado on an offer */
  async cambiarEstadoAdmin(id: string, estado: EstadoOferta) {
    const oferta = await this.prisma.ofertaLaboral.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!oferta) throw new NotFoundException('No se encontró la oferta indicada.');

    return this.prisma.ofertaLaboral.update({
      where: { id },
      data: { estado },
      include: {
        empresa: { select: { id: true, nombreComercial: true } },
        habilidades: { include: { habilidad: true } },
      },
    });
  }

  /** Delete an offer. ADMIN can delete any; EMPRESA only their own. */
  async delete(id: string, requesterId: string, requesterRole?: Role) {
    if (requesterRole !== Role.ADMIN) {
      await this.ensureEmpresaOwnsOferta(id, requesterId);
    } else {
      const exists = await this.prisma.ofertaLaboral.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw new NotFoundException('No se encontró la oferta indicada.');
    }
    await this.prisma.ofertaLaboral.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureEmpresaOwnsOferta(ofertaId: string, empresaId: string) {
    const oferta = await this.prisma.ofertaLaboral.findUnique({
      where: { id: ofertaId },
      select: { empresaId: true },
    });
    if (!oferta) {
      throw new NotFoundException('No se encontró la oferta indicada.');
    }
    if (oferta.empresaId !== empresaId) {
      throw new ForbiddenException('Solo la empresa publicadora puede modificar esta oferta.');
    }
  }
}
