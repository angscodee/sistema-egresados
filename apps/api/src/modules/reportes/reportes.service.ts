import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { EstadoReporte, Prisma, Role } from '@prisma/client';
import { Queue } from 'bullmq';
import { join } from 'path';
import puppeteer from 'puppeteer';
import { PrismaService } from '../../prisma/prisma.service';
import { REPORT_QUEUE_NAME } from '../../queues/report-queue';
import { ensureReportsStorageDir } from '../../lib/reports-storage';
import { ReportesProcessor } from './reportes.processor';

@Injectable()
export class ReportesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(REPORT_QUEUE_NAME) private readonly reportsQueue: Queue,
    private readonly processor: ReportesProcessor,
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

  /**
   * Genera un PDF directamente (sin BullMQ) y devuelve la URL.
   * Útil cuando Redis no está disponible.
   */
  async generateDirect(
    userId: string,
    tipo: string,
    parametros?: Prisma.InputJsonValue | null,
  ): Promise<{ urlArchivo: string }> {
    const cleanTipo = tipo.trim();
    const reportId = `direct-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const html = await this.processor.buildHtmlPublic({ id: reportId, tipo: cleanTipo, parametros: (parametros ?? null) as Prisma.JsonValue | null });

    const dir = ensureReportsStorageDir();
    const pdfPath = join(dir, `${reportId}.pdf`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || undefined,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({ format: 'A4', path: pdfPath, printBackground: true });
    } finally {
      await browser.close();
    }

    const base = process.env.PUBLIC_ASSETS_BASE_URL?.replace(/\/$/, '') ?? '';
    const urlArchivo = base ? `${base}/reports/${reportId}.pdf` : `/reports/${reportId}.pdf`;

    // Persist in DB for history (optional)
    await this.prisma.reporte.create({
      data: {
        id: reportId,
        usuarioId: userId,
        tipo: cleanTipo,
        nombreArchivo: `${reportId}.pdf`,
        parametros: parametros === undefined || parametros === null ? Prisma.JsonNull : parametros,
        estado: EstadoReporte.COMPLETADO,
        completedAt: new Date(),
        urlArchivo,
      },
    }).catch(() => { /* non-fatal if id collision */ });

    return { urlArchivo };
  }
}
