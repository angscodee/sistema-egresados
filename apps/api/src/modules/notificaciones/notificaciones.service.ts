import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Notificacion, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesGateway } from './notificaciones.gateway';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificacionesGateway,
  ) {}

  async crear(
    usuarioId: string,
    tipo: string,
    titulo: string,
    contenido: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<Notificacion> {
    const notificacion = await this.prisma.notificacion.create({
      data: {
        usuarioId,
        tipo,
        titulo,
        contenido,
        metadata: metadata ?? undefined,
      },
    });
    this.gateway.emitNuevaNotificacion(usuarioId, notificacion);
    return notificacion;
  }

  async getMisNotificaciones(usuarioId: string): Promise<Notificacion[]> {
    return this.prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async marcarLeida(notificacionId: string, usuarioId: string): Promise<Notificacion> {
    const updated = await this.prisma.notificacion.updateMany({
      where: { id: notificacionId, usuarioId },
      data: { leida: true },
    });
    if (updated.count === 0) {
      throw new NotFoundException('No se encontró la notificación o no pertenece al usuario.');
    }
    return this.prisma.notificacion.findUniqueOrThrow({
      where: { id: notificacionId },
    });
  }

  async marcarTodasLeidas(usuarioId: string): Promise<{ actualizadas: number }> {
    const res = await this.prisma.notificacion.updateMany({
      where: { usuarioId, leida: false },
      data: { leida: true },
    });
    return { actualizadas: res.count };
  }

  /** No bloquea el flujo principal si falla la notificación en vivo. */
  async crearSeguro(
    usuarioId: string,
    tipo: string,
    titulo: string,
    contenido: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    try {
      await this.crear(usuarioId, tipo, titulo, contenido, metadata);
    } catch (err) {
      this.logger.warn(`No se pudo crear notificación para usuario ${usuarioId}: ${String(err)}`);
    }
  }
}
