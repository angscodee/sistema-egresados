import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EstadoOferta, EstadoPostulacion, EstadoReporte, Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { join } from 'path';
import puppeteer from 'puppeteer';
import { ensureReportsStorageDir } from '../../lib/reports-storage';
import { PrismaService } from '../../prisma/prisma.service';
import { REPORT_QUEUE_NAME } from '../../queues/report-queue';
import {
  renderComparativoCohortesReport,
  type ComparativoCohortesPdfData,
} from './templates/comparativo-cohortes.template';
import {
  renderDemandaLaboralReport,
  type DemandaLaboralPdfData,
} from './templates/demanda-laboral.template';
import {
  renderEmpleabilidadReport,
  type EmpleabilidadPdfData,
} from './templates/empleabilidad.template';
import {
  renderEgresadosCarreraReport,
  type EgresadosCarreraPdfData,
} from './templates/egresados-por-carrera.template';
import { renderOfertasActivasReport } from './templates/ofertas-activas.template';
import {
  renderPostulacionesPeriodoReport,
  type PostulacionesPeriodoPdfData,
} from './templates/postulaciones-periodo.template';
import {
  renderResumenOfertaReport,
  type ResumenOfertaPdfData,
} from './templates/resumen-oferta.template';

function jsonParams(raw: Prisma.JsonValue | null | undefined): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined) continue;
    out[k] = String(v);
  }
  return out;
}

@Processor(REPORT_QUEUE_NAME)
export class ReportesProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportesProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ reportId: string }, void, string>): Promise<void> {
    if (job.name !== 'generate-pdf') {
      this.logger.warn(`Omitiendo job "${job.name}" en cola ${REPORT_QUEUE_NAME}`);
      return;
    }

    const reportId = job.data?.reportId;
    if (!reportId || typeof reportId !== 'string') {
      throw new Error('Payload inválido: se esperaba { reportId: string }');
    }

    const reporte = await this.prisma.reporte.findUnique({ where: { id: reportId } });
    if (!reporte) {
      this.logger.error(`Reporte inexistente: ${reportId}`);
      return;
    }

    try {
      await this.prisma.reporte.update({
        where: { id: reportId },
        data: { estado: EstadoReporte.PROCESANDO },
      });

      const html = await this.buildHtmlPublic(reporte);
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

      await this.prisma.reporte.update({
        where: { id: reportId },
        data: {
          estado: EstadoReporte.COMPLETADO,
          completedAt: new Date(),
          urlArchivo,
        },
      });
    } catch (err) {
      this.logger.error(`Error generando PDF para reporte ${reportId}`, err as Error);
      await this.prisma.reporte.updateMany({
        where: { id: reportId },
        data: { estado: EstadoReporte.FALLIDO },
      });
      throw err;
    }
  }

  async buildHtmlPublic(reporte: {
    id: string;
    tipo: string;
    parametros: Prisma.JsonValue | null;
  }): Promise<string> {
    const params = jsonParams(reporte.parametros);
    const generatedAt = new Date();

    switch (reporte.tipo) {
      case 'empleabilidad_resumen': {
        const data = await this.loadEmpleabilidadData();
        return renderEmpleabilidadReport(data, generatedAt);
      }
      case 'ofertas_activas': {
        const data = await this.loadDemandaLaboralData(params);
        return renderOfertasActivasReport(data, generatedAt);
      }
      case 'demanda_laboral': {
        const data = await this.loadDemandaLaboralData(params);
        return renderDemandaLaboralReport(data, generatedAt);
      }
      case 'egresados_carrera': {
        const data = await this.loadEgresadosCarreraData(params);
        return renderEgresadosCarreraReport(data, generatedAt);
      }
      case 'comparativo_cohortes': {
        const data = await this.loadComparativoCohortesData();
        return renderComparativoCohortesReport(data, generatedAt);
      }
      case 'postulaciones_periodo': {
        const data = await this.loadPostulacionesPeriodoData(params);
        return renderPostulacionesPeriodoReport(data, generatedAt);
      }
      case 'resumen_oferta': {
        const data = await this.loadResumenOfertaData(params);
        return renderResumenOfertaReport(data, generatedAt);
      }
      default:
        throw new Error(`Tipo de reporte no soportado: ${reporte.tipo}`);
    }
  }

  private async loadEmpleabilidadData(): Promise<EmpleabilidadPdfData> {
    const [totalEgresados, ofertasActivas, totalPostulaciones, contratadosGroup] = await Promise.all([
      this.prisma.egresado.count(),
      this.prisma.ofertaLaboral.count({ where: { estado: EstadoOferta.ACTIVA } }),
      this.prisma.postulacion.count(),
      this.prisma.postulacion.groupBy({
        by: ['egresadoId'],
        where: { estado: EstadoPostulacion.CONTRATADO },
      }),
    ]);

    const tasaPct =
      totalEgresados === 0
        ? '0'
        : String(Math.round((contratadosGroup.length / totalEgresados) * 10000) / 100);

    const egresados = await this.prisma.egresado.findMany({
      select: { id: true, anioEgreso: true },
    });
    const contratadosRows = await this.prisma.postulacion.findMany({
      where: { estado: EstadoPostulacion.CONTRATADO },
      select: { egresadoId: true },
    });
    const contratadoIds = new Set(contratadosRows.map((c) => c.egresadoId));

    type Key = number | 'sin_anio';
    const cohorts = new Map<Key, { total: number; contratados: number }>();
    for (const e of egresados) {
      const key: Key = e.anioEgreso ?? 'sin_anio';
      const cur = cohorts.get(key) ?? { total: 0, contratados: 0 };
      cur.total += 1;
      if (contratadoIds.has(e.id)) cur.contratados += 1;
      cohorts.set(key, cur);
    }

    const cohortRows = [...cohorts.entries()]
      .map(([anioEgreso, v]) => ({
        anio: anioEgreso === 'sin_anio' ? 'Sin año' : String(anioEgreso),
        egresados: v.total,
        contratados: v.contratados,
        tasa: v.total === 0 ? '0' : String(Math.round((v.contratados / v.total) * 10000) / 100),
      }))
      .sort((a, b) => {
        if (a.anio === 'Sin año') return 1;
        if (b.anio === 'Sin año') return -1;
        return Number(b.anio) - Number(a.anio);
      });

    const skillGroups = await this.prisma.ofertaHabilidad.groupBy({
      by: ['habilidadId'],
      where: { oferta: { estado: EstadoOferta.ACTIVA } },
      _count: { habilidadId: true },
      orderBy: { _count: { habilidadId: 'desc' } },
      take: 12,
    });

    let topSkills: { nombre: string; demanda: number; tipo: string }[] = [];
    if (skillGroups.length > 0) {
      const habilidades = await this.prisma.habilidad.findMany({
        where: { id: { in: skillGroups.map((r) => r.habilidadId) } },
        select: { id: true, nombre: true, tipo: true },
      });
      const byId = new Map(habilidades.map((h) => [h.id, h]));
      topSkills = skillGroups.map((r) => {
        const h = byId.get(r.habilidadId);
        return {
          nombre: h?.nombre ?? '—',
          demanda: r._count.habilidadId,
          tipo: h?.tipo ?? '—',
        };
      });
    }

    return {
      kpis: [
        { label: 'Egresados registrados', value: String(totalEgresados) },
        { label: 'Tasa empleabilidad %', value: tasaPct },
        { label: 'Ofertas activas', value: String(ofertasActivas) },
        { label: 'Postulaciones totales', value: String(totalPostulaciones) },
      ],
      cohortRows,
      topSkills,
    };
  }

  private async loadComparativoCohortesData(): Promise<ComparativoCohortesPdfData> {
    const empleabilidad = await this.loadEmpleabilidadData();
    const rows = empleabilidad.cohortRows.map((r) => ({
      cohorte: r.anio,
      egresados: r.egresados,
      contratados: r.contratados,
      tasa: r.tasa,
    }));

    const tasasNumericas = rows
      .filter((r) => r.cohorte !== 'Sin año')
      .map((r) => Number.parseFloat(r.tasa))
      .filter((n) => !Number.isNaN(n));

    const tasaPromedio =
      tasasNumericas.length === 0
        ? '0'
        : String(Math.round((tasasNumericas.reduce((a, b) => a + b, 0) / tasasNumericas.length) * 100) / 100);

    const tasaMaxima =
      tasasNumericas.length === 0 ? '0' : String(Math.round(Math.max(...tasasNumericas) * 100) / 100);

    const totalEgresados = rows.reduce((acc, r) => acc + r.egresados, 0);
    const totalContratados = rows.reduce((acc, r) => acc + r.contratados, 0);

    return {
      kpis: [
        { label: 'Cohortes en tabla', value: String(rows.length) },
        { label: 'Tasa promedio %', value: tasaPromedio },
        { label: 'Tasa máxima %', value: tasaMaxima },
        { label: 'Contratados / egresados', value: `${totalContratados} / ${totalEgresados}` },
      ],
      rows,
    };
  }

  private async loadDemandaLaboralData(params: Record<string, string>): Promise<DemandaLaboralPdfData> {
    const sector = params.sector?.trim();
    const whereOffer: Prisma.OfertaLaboralWhereInput = { estado: EstadoOferta.ACTIVA };
    if (sector) {
      whereOffer.empresa = { sector: { contains: sector, mode: 'insensitive' } };
    }

    const [total, ofertas, byModal] = await Promise.all([
      this.prisma.ofertaLaboral.count({ where: whereOffer }),
      this.prisma.ofertaLaboral.findMany({
        where: whereOffer,
        orderBy: { fechaPublicacion: 'desc' },
        take: 40,
        include: { empresa: { select: { nombreComercial: true } } },
      }),
      this.prisma.ofertaLaboral.groupBy({
        by: ['modalidad'],
        where: whereOffer,
        _count: { id: true },
      }),
    ]);

    let sumMin = 0;
    let nMin = 0;
    for (const o of ofertas) {
      if (o.salarioMin != null) {
        sumMin += o.salarioMin;
        nMin += 1;
      }
    }
    const promMin = nMin === 0 ? '—' : String(Math.round(sumMin / nMin));

    const empresasUnicas = new Set(ofertas.map((o) => o.empresaId));

    const ofertasRows = ofertas.map((o) => {
      const sal =
        o.salarioMin != null || o.salarioMax != null
          ? `${o.salarioMin ?? '—'} – ${o.salarioMax ?? '—'}`
          : 'No especificado';
      const pub = o.fechaPublicacion.toLocaleDateString('es');
      return {
        titulo: o.titulo,
        empresa: o.empresa.nombreComercial,
        modalidad: o.modalidad,
        salario: sal,
        publicada: pub,
      };
    });

    const modalidadRows = byModal
      .map((m) => ({ modalidad: m.modalidad, total: m._count.id }))
      .sort((a, b) => b.total - a.total);

    return {
      kpis: [
        { label: 'Ofertas activas', value: String(total) },
        { label: 'Salario mín. prom.', value: promMin },
        { label: 'Empresas (muestra)', value: String(empresasUnicas.size) },
        { label: 'Filas listadas', value: String(ofertasRows.length) },
      ],
      ofertasRows,
      modalidadRows,
    };
  }

  private async loadEgresadosCarreraData(params: Record<string, string>): Promise<EgresadosCarreraPdfData> {
    const carreraQ = params.carrera?.trim();
    const anioQ = params.anioEgreso?.trim();

    const where: Prisma.EgresadoWhereInput = {};
    if (carreraQ) {
      where.carrera = { contains: carreraQ, mode: 'insensitive' };
    }
    if (anioQ) {
      const y = Number(anioQ);
      if (!Number.isNaN(y)) where.anioEgreso = y;
    }

    const [total, withCv, rows] = await Promise.all([
      this.prisma.egresado.count({ where }),
      this.prisma.egresado.count({ where: { ...where, cvUrl: { not: null } } }),
      this.prisma.egresado.findMany({
        where,
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
        take: 80,
        select: {
          nombre: true,
          apellido: true,
          dni: true,
          carrera: true,
          anioEgreso: true,
          telefono: true,
        },
      }),
    ]);

    return {
      filtroCarrera: carreraQ || 'Todas',
      filtroAnio: anioQ || null,
      kpis: [
        { label: 'Coincidencias', value: String(total) },
        { label: 'Con CV cargado', value: String(withCv) },
        { label: 'En esta página', value: String(rows.length) },
        { label: 'Cupo listado', value: '80' },
      ],
      rows: rows.map((r) => ({
        nombre: `${r.nombre} ${r.apellido}`.trim(),
        dni: r.dni,
        carrera: r.carrera?.trim() || '—',
        anioEgreso: r.anioEgreso != null ? String(r.anioEgreso) : '—',
        telefono: r.telefono?.trim() || '—',
      })),
    };
  }

  private async loadPostulacionesPeriodoData(params: Record<string, string>): Promise<PostulacionesPeriodoPdfData> {
    const where: Prisma.PostulacionWhereInput = {};
    const createdFilter: Prisma.DateTimeFilter = {};
    if (params.desde) {
      createdFilter.gte = new Date(`${params.desde}T00:00:00.000Z`);
    }
    if (params.hasta) {
      createdFilter.lte = new Date(`${params.hasta}T23:59:59.999Z`);
    }
    if (Object.keys(createdFilter).length > 0) {
      where.createdAt = createdFilter;
    }

    const [total, enRevision, contratados, rows] = await Promise.all([
      this.prisma.postulacion.count({ where }),
      this.prisma.postulacion.count({
        where: { ...where, estado: EstadoPostulacion.EN_REVISION },
      }),
      this.prisma.postulacion.count({
        where: { ...where, estado: EstadoPostulacion.CONTRATADO },
      }),
      this.prisma.postulacion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          egresado: { select: { nombre: true, apellido: true, dni: true } },
          oferta: {
            select: { titulo: true, empresa: { select: { nombreComercial: true } } },
          },
        },
      }),
    ]);

    const periodoLabel =
      params.desde || params.hasta
        ? `Periodo: desde ${params.desde || '…'} hasta ${params.hasta || '…'}`
        : 'Periodo: todo el histórico';

    return {
      periodoLabel,
      kpis: [
        { label: 'Postulaciones', value: String(total) },
        { label: 'En revisión', value: String(enRevision) },
        { label: 'Contratados', value: String(contratados) },
        { label: 'Filas en PDF', value: String(rows.length) },
      ],
      rows: rows.map((r) => ({
        egresado: `${r.egresado.nombre} ${r.egresado.apellido}`.trim(),
        dni: r.egresado.dni,
        oferta: r.oferta.titulo,
        empresa: r.oferta.empresa.nombreComercial,
        estado: r.estado,
        fecha: r.createdAt.toLocaleDateString('es'),
      })),
    };
  }

  private async loadResumenOfertaData(params: Record<string, string>): Promise<ResumenOfertaPdfData> {
    const ofertaId = params.ofertaId;
    if (!ofertaId) throw new Error('Se requiere ofertaId para el reporte resumen_oferta');

    const oferta = await this.prisma.ofertaLaboral.findUnique({
      where: { id: ofertaId },
      include: {
        empresa: { select: { nombreComercial: true } },
        postulaciones: {
          include: {
            egresado: {
              include: { user: { select: { email: true } } },
            },
          },
        },
      },
    });

    if (!oferta) throw new Error(`Oferta no encontrada: ${ofertaId}`);

    // Count by estado
    const estadoMap = new Map<string, number>();
    for (const p of oferta.postulaciones) {
      estadoMap.set(p.estado, (estadoMap.get(p.estado) ?? 0) + 1);
    }
    const estadoResumen = [...estadoMap.entries()]
      .map(([estado, total]) => ({ estado, total }))
      .sort((a, b) => b.total - a.total);

    const contratados = oferta.postulaciones
      .filter((p) => p.estado === EstadoPostulacion.CONTRATADO)
      .map((p) => ({
        nombre: `${p.egresado.nombre} ${p.egresado.apellido}`.trim(),
        dni: p.egresado.dni,
        carrera: p.egresado.carrera?.trim() || '—',
        anioEgreso: p.egresado.anioEgreso != null ? String(p.egresado.anioEgreso) : '—',
        telefono: p.egresado.telefono?.trim() || '—',
        email: p.egresado.user?.email ?? '—',
      }));

    const total = oferta.postulaciones.length;

    return {
      oferta: {
        titulo: oferta.titulo,
        empresa: oferta.empresa.nombreComercial,
        modalidad: oferta.modalidad,
        tipoContrato: oferta.tipoContrato,
        ubicacion: oferta.ubicacion,
        salarioMin: oferta.salarioMin,
        salarioMax: oferta.salarioMax,
        fechaPublicacion: oferta.fechaPublicacion.toLocaleDateString('es'),
        fechaCierre: oferta.fechaCierre ? oferta.fechaCierre.toLocaleDateString('es') : null,
        estado: oferta.estado,
        descripcion: oferta.descripcion,
      },
      kpis: [
        { label: 'Total postulaciones', value: String(total) },
        { label: 'Contratados', value: String(contratados.length) },
        { label: 'Tasa contratación %', value: total === 0 ? '0' : String(Math.round((contratados.length / total) * 10000) / 100) },
        { label: 'Estado oferta', value: oferta.estado },
      ],
      contratados,
      estadoResumen,
    };
  }
}
