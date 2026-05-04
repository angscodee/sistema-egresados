import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { EstadoReporte, Prisma, Role } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { REPORT_QUEUE_NAME } from '../../queues/report-queue';

@Injectable()
export class ReportesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(REPORT_QUEUE_NAME) private readonly reportsQueue: Queue,
  ) {}

  async generateReport(
    userId: string,
    tipo: string,
    parametros?: Prisma.InputJsonValue | null,
  ) {
    const cleanTipo = tipo.trim();
    const nombreArchivo = `${cleanTipo}-${Date.now()}.pdf`;

    const reporte = await this.prisma.reporte.create({
      data: {
        usuarioId: userId,
        tipo: cleanTipo,
        nombreArchivo,
        parametros: parametros === undefined || parametros === null ? Prisma.JsonNull : parametros,
        estado: EstadoReporte.PENDIENTE,
      },
    });

    await this.reportsQueue.add(
      'generate-pdf',
      { reportId: reporte.id },
      {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );

    return reporte;
  }

  async getReportStatus(reportId: string) {
    const reporte = await this.prisma.reporte.findUnique({
      where: { id: reportId },
    });
    if (!reporte) {
      throw new NotFoundException('No se encontró el reporte indicado.');
    }
    return reporte;
  }

  async getHistorialReportes(userId: string) {
    return this.prisma.reporte.findMany({
      where: { usuarioId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async obtenerPorId(id: string, usuarioId: string, role: Role) {
    const reporte = await this.getReportStatus(id);
    if (role !== Role.ADMIN && reporte.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tiene acceso a este reporte.');
    }
    return reporte;
  }
}
