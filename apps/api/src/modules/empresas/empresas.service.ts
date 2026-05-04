import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoValidacion, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterEmpresasDto } from './dto/filter-empresas.dto';
import { RechazarEmpresaDto } from './dto/rechazar-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FilterEmpresasDto) {
    const skip = filters.skip ?? 0;
    const take = filters.take ?? 20;

    const where: Prisma.EmpresaWhereInput = {};

    if (filters.estadoValidacion) {
      where.estadoValidacion = filters.estadoValidacion;
    }

    if (filters.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { nombreComercial: { contains: term, mode: 'insensitive' } },
        { razonSocial: { contains: term, mode: 'insensitive' } },
        { ruc: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.empresa.findMany({
        where,
        skip,
        take,
        orderBy: { nombreComercial: 'asc' },
        include: {
          _count: { select: { ofertas: { where: { estado: 'ACTIVA' } } } },
        },
      }),
      this.prisma.empresa.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async findOne(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
      include: {
        ofertas: {
          orderBy: { fechaPublicacion: 'desc' },
          include: {
            habilidades: { include: { habilidad: true } },
            _count: { select: { postulaciones: true } },
          },
        },
      },
    });

    if (!empresa) {
      throw new NotFoundException('No se encontró la empresa indicada.');
    }

    return empresa;
  }

  async validar(id: string) {
    await this.ensureExists(id);

    return this.prisma.empresa.update({
      where: { id },
      data: {
        estadoValidacion: EstadoValidacion.APROBADA,
        motivoRechazo: null,
      },
    });
  }

  async rechazar(id: string, dto: RechazarEmpresaDto) {
    await this.ensureExists(id);

    return this.prisma.empresa.update({
      where: { id },
      data: {
        estadoValidacion: EstadoValidacion.RECHAZADA,
        motivoRechazo: dto.motivo.trim(),
      },
    });
  }

  async updateLogoUrl(id: string, filename: string, requesterId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!empresa) throw new NotFoundException('No se encontró la empresa indicada.');

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true },
    });
    if (requester?.role !== Role.ADMIN && requesterId !== id) {
      throw new ForbiddenException('No tiene permiso para modificar esta empresa.');
    }

    const logoUrl = `/static/logos/${filename}`;
    return this.prisma.empresa.update({
      where: { id },
      data: { logoUrl },
      select: { id: true, logoUrl: true },
    });
  }

  async update(id: string, dto: UpdateEmpresaDto, requesterId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!empresa) {
      throw new NotFoundException('No se encontró la empresa indicada.');
    }

    // Only the empresa owner or an admin can update
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true },
    });

    if (requester?.role !== Role.ADMIN && requesterId !== id) {
      throw new ForbiddenException('No tiene permiso para modificar esta empresa.');
    }

    if (dto.ruc) {
      const rucTaken = await this.prisma.empresa.findFirst({
        where: { ruc: dto.ruc.trim(), NOT: { id } },
        select: { id: true },
      });
      if (rucTaken) {
        throw new ConflictException('El RUC ya está registrado en otra empresa.');
      }
    }

    const data: Prisma.EmpresaUpdateInput = {};
    if (dto.nombreComercial !== undefined) data.nombreComercial = dto.nombreComercial.trim();
    if (dto.razonSocial !== undefined) data.razonSocial = dto.razonSocial.trim();
    if (dto.ruc !== undefined) data.ruc = dto.ruc.trim();
    if (dto.sector !== undefined) data.sector = dto.sector?.trim() ?? null;
    if (dto.sitioWeb !== undefined) data.sitioWeb = dto.sitioWeb?.trim() ?? null;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion?.trim() ?? null;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl?.trim() ?? null;

    return this.prisma.empresa.update({ where: { id }, data });
  }

  private async ensureExists(id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!empresa) {
      throw new NotFoundException('No se encontró la empresa indicada.');
    }
  }
}
