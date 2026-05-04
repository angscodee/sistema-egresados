import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHabilidadDto } from './dto/create-habilidad.dto';
import { UpdateHabilidadDto } from './dto/update-habilidad.dto';

@Injectable()
export class HabilidadesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    const where = search?.trim()
      ? { nombre: { contains: search.trim(), mode: 'insensitive' as const } }
      : {};
    return this.prisma.habilidad.findMany({
      where,
      orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }],
      include: {
        _count: { select: { egresados: true, ofertas: true } },
      },
    });
  }

  async create(dto: CreateHabilidadDto) {
    const existing = await this.prisma.habilidad.findUnique({
      where: { nombre: dto.nombre.trim() },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`Ya existe una habilidad con el nombre "${dto.nombre}".`);
    }
    return this.prisma.habilidad.create({
      data: {
        nombre: dto.nombre.trim(),
        tipo: dto.tipo,
        categoria: dto.categoria?.trim() ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateHabilidadDto) {
    await this.ensureExists(id);

    if (dto.nombre) {
      const taken = await this.prisma.habilidad.findFirst({
        where: { nombre: dto.nombre.trim(), NOT: { id } },
        select: { id: true },
      });
      if (taken) {
        throw new ConflictException(`Ya existe una habilidad con el nombre "${dto.nombre}".`);
      }
    }

    return this.prisma.habilidad.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
        ...(dto.tipo !== undefined && { tipo: dto.tipo }),
        ...(dto.categoria !== undefined && { categoria: dto.categoria?.trim() ?? null }),
      },
    });
  }

  async delete(id: string) {
    await this.ensureExists(id);
    await this.prisma.habilidad.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureExists(id: string) {
    const h = await this.prisma.habilidad.findUnique({ where: { id }, select: { id: true } });
    if (!h) throw new NotFoundException('No se encontró la habilidad indicada.');
  }
}
