import { Injectable, NotFoundException } from '@nestjs/common';
import {
  EstadoOferta,
  EstadoPostulacion,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { cacheGet, cacheSet } from '../../lib/redis-cache';

/** Admin dashboard cache TTL: 5 minutes */
const ADMIN_DASHBOARD_TTL = 300;

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function monthAnchorFromEnd(end: Date, monthsBack: number): Date {
  return new Date(end.getFullYear(), end.getMonth() - monthsBack, 1);
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function monthLabel(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export type DashboardDateRange = {
  startDate?: Date;
  endDate?: Date;
};

@Injectable()
export class EstadisticasService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminDashboard(input: DashboardDateRange = {}) {
    // Build a deterministic cache key from the date range
    const cacheKey = `admin_dashboard:${input.startDate?.toISOString() ?? 'all'}:${input.endDate?.toISOString() ?? 'all'}`;

    const cached = await cacheGet<ReturnType<typeof this.buildAdminDashboard>>(cacheKey);
    if (cached) {
      return cached as Awaited<ReturnType<typeof this.buildAdminDashboard>>;
    }

    const result = await this.buildAdminDashboard(input);
    await cacheSet(cacheKey, result, ADMIN_DASHBOARD_TTL);
    return result;
  }

  private async buildAdminDashboard(input: DashboardDateRange = {}) {
    const { startDate, endDate } = input;

    const egresadoWhere: Prisma.EgresadoWhereInput = {};
    const empresaWhere: Prisma.EmpresaWhereInput = {
      ofertas: { some: { estado: EstadoOferta.ACTIVA } },
    };
    const ofertaRangeWhere: Prisma.OfertaLaboralWhereInput = { estado: EstadoOferta.ACTIVA };
    const contratadosWhere: Prisma.PostulacionWhereInput = { estado: EstadoPostulacion.CONTRATADO };
    if (startDate && endDate) {
      egresadoWhere.user = { createdAt: { gte: startDate, lte: endDate } };
      empresaWhere.user = { createdAt: { gte: startDate, lte: endDate } };
      ofertaRangeWhere.fechaPublicacion = { gte: startDate, lte: endDate };
      contratadosWhere.updatedAt = { gte: startDate, lte: endDate };
    }

    const [
      totalEgresados,
      totalEmpresas,
      ofertasActivas,
      contratadosDistinct,
    ] = await Promise.all([
      this.prisma.egresado.count({ where: egresadoWhere }),
      this.prisma.empresa.count({ where: empresaWhere }),
      this.prisma.ofertaLaboral.count({ where: ofertaRangeWhere }),
      this.prisma.postulacion.groupBy({
        by: ['egresadoId'],
        where: contratadosWhere,
      }),
    ]);

    const tasaEmpleabilidad =
      totalEgresados === 0
        ? 0
        : Math.round((contratadosDistinct.length / totalEgresados) * 10000) / 100;

    const [
      ofertasVsPostulacionesMensual,
      egresadosPorCarrera,
      topHabilidadesDemandadas,
      tasaContratacionPorCohorte,
    ] = await Promise.all([
      this.buildOfertasVsPostulacionesMensual(input),
      this.buildEgresadosPorCarrera(input),
      this.buildTopHabilidadesDemandadas(input),
      this.buildTasaContratacionPorCohorte(input),
    ]);

    return {
      kpis: {
        totalEgresados,
        totalEmpresas,
        ofertasActivas,
        tasaEmpleabilidad,
      },
      graficas: {
        ofertasVsPostulacionesMensual,
        egresadosPorCarrera,
        topHabilidadesDemandadas,
        tasaContratacionPorCohorte,
      },
    };
  }

  async getEgresadoDashboard(egresadoId: string) {
    const egresado = await this.prisma.egresado.findUnique({
      where: { id: egresadoId },
      include: {
        habilidades: {
          include: {
            habilidad: { select: { id: true, nombre: true } },
          },
        },
      },
    });
    if (!egresado) {
      throw new NotFoundException('No se encontró el egresado indicado.');
    }

    const [
      totalPostulaciones,
      enRevision,
      entrevistas,
      contratadas,
      rechazadas,
      postulacionesPorEstadoRaw,
      postulacionesMensualesRaw,
    ] = await Promise.all([
      this.prisma.postulacion.count({ where: { egresadoId } }),
      this.prisma.postulacion.count({ where: { egresadoId, estado: EstadoPostulacion.EN_REVISION } }),
      this.prisma.postulacion.count({ where: { egresadoId, estado: EstadoPostulacion.ENTREVISTA } }),
      this.prisma.postulacion.count({ where: { egresadoId, estado: EstadoPostulacion.CONTRATADO } }),
      this.prisma.postulacion.count({ where: { egresadoId, estado: EstadoPostulacion.RECHAZADO } }),
      this.prisma.postulacion.groupBy({
        by: ['estado'],
        where: { egresadoId },
        _count: { estado: true },
      }),
      this.prisma.postulacion.groupBy({
        by: ['createdAt'],
        where: {
          egresadoId,
          createdAt: { gte: monthAnchorFromEnd(new Date(), 11) },
        },
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const conRespuesta = enRevision + entrevistas + contratadas + rechazadas;
    const tasaRespuesta = totalPostulaciones === 0 ? 0 : Math.round((conRespuesta / totalPostulaciones) * 10000) / 100;
    const tasaContratacion = totalPostulaciones === 0 ? 0 : Math.round((contratadas / totalPostulaciones) * 10000) / 100;
    const recomendaciones = await this.buildRecomendacionesOfertas(egresadoId);
    const topHabilidades = recomendaciones
      .slice(0, 10)
      .map((r) => ({ titulo: r.titulo, matchPct: r.matchPct, empresaNombre: r.empresaNombre }));

    const bucket = new Map<string, number>();
    for (let back = 11; back >= 0; back--) {
      const ref = monthAnchorFromEnd(new Date(), back);
      bucket.set(`${ref.getFullYear()}-${ref.getMonth() + 1}`, 0);
    }
    for (const row of postulacionesMensualesRaw) {
      const key = `${row.createdAt.getFullYear()}-${row.createdAt.getMonth() + 1}`;
      bucket.set(key, (bucket.get(key) ?? 0) + row._count.id);
    }
    const postulacionesMensuales = [...bucket.entries()].map(([key, total]) => {
      const [y, m] = key.split('-').map((v) => Number(v));
      return { mes: monthLabel(new Date(y, m - 1, 1)), postulaciones: total };
    });

    return {
      kpis: {
        totalPostulaciones,
        enRevision,
        entrevistas,
        contratadas,
        rechazadas,
        tasaRespuesta,
        tasaContratacion,
      },
      graficas: {
        postulacionesPorEstado: postulacionesPorEstadoRaw.map((r) => ({ estado: r.estado, total: r._count.estado })),
        postulacionesMensuales,
        topHabilidadesMatch: topHabilidades,
      },
      recomendaciones,
    };
  }

  async getEmpresaDashboard(empresaId: string, input: DashboardDateRange = {}) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true },
    });
    if (!empresa) {
      throw new NotFoundException('No se encontró la empresa indicada.');
    }

    const { startDate, endDate } = input;

    const postBase: Prisma.PostulacionWhereInput = {
      oferta: { empresaId },
    };
    if (startDate && endDate) {
      postBase.createdAt = { gte: startDate, lte: endDate };
    }

    const contratadosWhere: Prisma.PostulacionWhereInput = {
      ...postBase,
      estado: EstadoPostulacion.CONTRATADO,
    };
    if (startDate && endDate) {
      contratadosWhere.updatedAt = { gte: startDate, lte: endDate };
    }

    const [totalOfertas, ofertasActivas, totalPostulaciones, totalContratados, postulacionesPorEstado, contratacionesMensualesRaw] = await Promise.all([
      this.prisma.ofertaLaboral.count({
        where: {
          empresaId,
          ...(startDate && endDate ? { fechaPublicacion: { gte: startDate, lte: endDate } } : {}),
        },
      }),
      this.prisma.ofertaLaboral.count({
        where: {
          empresaId,
          estado: EstadoOferta.ACTIVA,
          ...(startDate && endDate ? { fechaPublicacion: { gte: startDate, lte: endDate } } : {}),
        },
      }),
      this.prisma.postulacion.count({ where: postBase }),
      this.prisma.postulacion.count({ where: contratadosWhere }),
      this.prisma.postulacion.groupBy({
        by: ['estado'],
        where: postBase,
        _count: { estado: true },
      }),
      this.prisma.postulacion.groupBy({
        by: ['updatedAt'],
        where: contratadosWhere,
        _count: { id: true },
        orderBy: { updatedAt: 'asc' },
      }),
    ]);

    const tasaConversion =
      totalPostulaciones === 0
        ? 0
        : Math.round((totalContratados / totalPostulaciones) * 10000) / 100;

    const ofertas = await this.prisma.ofertaLaboral.findMany({
      where: { empresaId },
      select: {
        id: true,
        titulo: true,
        estado: true,
        _count: { select: { postulaciones: true } },
      },
    });

    const rendimientoOfertas = await Promise.all(
      ofertas.map(async (o) => {
        const [postCount, hired] = await Promise.all([
          this.prisma.postulacion.count({
            where: {
              ofertaId: o.id,
              ...(startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {}),
            },
          }),
          this.prisma.postulacion.count({
            where: {
              ofertaId: o.id,
              estado: EstadoPostulacion.CONTRATADO,
              ...(startDate && endDate
                ? { updatedAt: { gte: startDate, lte: endDate } }
                : {}),
            },
          }),
        ]);
        const tasaOferta =
          postCount === 0 ? 0 : Math.round((hired / postCount) * 10000) / 100;
        return {
          ofertaId: o.id,
          titulo: o.titulo,
          estado: o.estado,
          postulaciones: postCount,
          contratados: hired,
          tasaConversion: tasaOferta,
        };
      }),
    );

    const monthlyStart = startDate ?? monthAnchorFromEnd(new Date(), 11);
    const monthlyEnd = endDate ?? new Date();
    const monthlyMap = new Map<string, number>();
    for (let back = 11; back >= 0; back--) {
      const ref = monthAnchorFromEnd(monthlyEnd, back);
      if (ref < startOfMonth(monthlyStart)) continue;
      monthlyMap.set(`${ref.getFullYear()}-${ref.getMonth() + 1}`, 0);
    }
    for (const item of contratacionesMensualesRaw) {
      const key = `${item.updatedAt.getFullYear()}-${item.updatedAt.getMonth() + 1}`;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + item._count.id);
    }
    const contratacionesMensuales = [...monthlyMap.entries()].map(([key, contrataciones]) => {
      const [y, m] = key.split('-').map(Number);
      return { mes: monthLabel(new Date(y, m - 1, 1)), contrataciones };
    });

    const postulacionesPorOferta = rendimientoOfertas
      .slice()
      .sort((a, b) => b.postulaciones - a.postulaciones)
      .slice(0, 10);

    return {
      kpis: {
        totalOfertas,
        ofertasActivas,
        totalPostulaciones,
        totalContratados,
        tasaConversion,
      },
      graficas: {
        postulacionesPorEstado: postulacionesPorEstado.map((p) => ({ estado: p.estado, total: p._count.estado })),
        postulacionesPorOferta: postulacionesPorOferta.map((o) => ({
          ofertaId: o.ofertaId,
          titulo: o.titulo,
          postulaciones: o.postulaciones,
          contratados: o.contratados,
        })),
        contratacionesMensuales,
      },
      rendimientoOfertas,
    };
  }

  private async buildOfertasVsPostulacionesMensual(input: DashboardDateRange = {}) {
    const end = input.endDate ?? new Date();
    const floor = input.startDate;
    const out: { mes: string; ofertas: number; postulaciones: number }[] = [];

    for (let back = 11; back >= 0; back--) {
      const ref = monthAnchorFromEnd(end, back);
      const start = startOfMonth(ref);
      const finish = endOfMonth(ref);
      if (floor && finish < floor) {
        continue;
      }
      const mes = monthLabel(ref);

      const [ofertas, postulaciones] = await Promise.all([
        this.prisma.ofertaLaboral.count({
          where: {
            fechaPublicacion: {
              gte: floor && floor > start ? floor : start,
              lte: finish,
            },
          },
        }),
        this.prisma.postulacion.count({
          where: {
            createdAt: {
              gte: floor && floor > start ? floor : start,
              lte: finish,
            },
          },
        }),
      ]);

      out.push({ mes, ofertas, postulaciones });
    }

    return out;
  }

  private async buildEgresadosPorCarrera(input: DashboardDateRange = {}) {
    const where: Prisma.EgresadoWhereInput = {};
    if (input.startDate && input.endDate) {
      where.user = { createdAt: { gte: input.startDate, lte: input.endDate } };
    }
    const rows = await this.prisma.egresado.groupBy({
      by: ['carrera'],
      where,
      _count: { id: true },
    });

    return rows.map((r) => ({
      carrera: r.carrera?.trim() || 'Sin carrera',
      total: r._count.id,
    }));
  }

  private async buildTopHabilidadesDemandadas(input: DashboardDateRange = {}) {
    const rows = await this.prisma.ofertaHabilidad.groupBy({
      by: ['habilidadId'],
      where: {
        oferta: {
          estado: EstadoOferta.ACTIVA,
          ...(input.startDate && input.endDate
            ? { fechaPublicacion: { gte: input.startDate, lte: input.endDate } }
            : {}),
        },
      },
      _count: { habilidadId: true },
      orderBy: { _count: { habilidadId: 'desc' } },
      take: 10,
    });

    if (rows.length === 0) {
      return [];
    }

    const habilidades = await this.prisma.habilidad.findMany({
      where: { id: { in: rows.map((r) => r.habilidadId) } },
      select: { id: true, nombre: true, tipo: true },
    });
    const nombrePorId = new Map(habilidades.map((h) => [h.id, h]));

    return rows.map((r) => {
      const h = nombrePorId.get(r.habilidadId);
      return {
        habilidadId: r.habilidadId,
        nombre: h?.nombre ?? '—',
        tipo: h?.tipo ?? null,
        demanda: r._count.habilidadId,
      };
    });
  }

  private async buildTasaContratacionPorCohorte(input: DashboardDateRange = {}) {
    const egresadosWhere: Prisma.EgresadoWhereInput = {};
    if (input.startDate && input.endDate) {
      egresadosWhere.user = { createdAt: { gte: input.startDate, lte: input.endDate } };
    }
    const egresados = await this.prisma.egresado.findMany({
      where: egresadosWhere,
      select: { id: true, anioEgreso: true },
    });

    const contratados = await this.prisma.postulacion.findMany({
      where: {
        estado: EstadoPostulacion.CONTRATADO,
        ...(input.startDate && input.endDate ? { updatedAt: { gte: input.startDate, lte: input.endDate } } : {}),
      },
      select: { egresadoId: true },
    });
    const contratadoIds = new Set(contratados.map((c) => c.egresadoId));

    type CohortKey = number | 'sin_anio';
    const cohorts = new Map<CohortKey, { total: number; contratados: number }>();

    for (const e of egresados) {
      const key: CohortKey = e.anioEgreso ?? 'sin_anio';
      const cur = cohorts.get(key) ?? { total: 0, contratados: 0 };
      cur.total += 1;
      if (contratadoIds.has(e.id)) {
        cur.contratados += 1;
      }
      cohorts.set(key, cur);
    }

    return [...cohorts.entries()]
      .map(([anioEgreso, v]) => ({
        anioEgreso: anioEgreso === 'sin_anio' ? null : anioEgreso,
        totalEgresados: v.total,
        contratados: v.contratados,
        tasa:
          v.total === 0
            ? 0
            : Math.round((v.contratados / v.total) * 10000) / 100,
      }))
      .sort((a, b) => {
        if (a.anioEgreso === null) return 1;
        if (b.anioEgreso === null) return -1;
        return b.anioEgreso - a.anioEgreso;
      });
  }

  private async buildRecomendacionesOfertas(egresadoId: string) {
    const egresado = await this.prisma.egresado.findUnique({
      where: { id: egresadoId },
      select: {
        habilidades: { select: { habilidadId: true } },
      },
    });
    if (!egresado) {
      return [];
    }

    const mySkills = new Set(egresado.habilidades.map((h) => h.habilidadId));

    const yaPostuladas = await this.prisma.postulacion.findMany({
      where: { egresadoId },
      select: { ofertaId: true },
    });
    const excluir = yaPostuladas.map((p) => p.ofertaId);

    const ofertas = await this.prisma.ofertaLaboral.findMany({
      where: {
        estado: EstadoOferta.ACTIVA,
        ...(excluir.length > 0 ? { id: { notIn: excluir } } : {}),
      },
      include: {
        habilidades: { include: { habilidad: true } },
        empresa: { select: { nombreComercial: true } },
      },
      take: 150,
      orderBy: { fechaPublicacion: 'desc' },
    });

    const recomendaciones = ofertas.map((o) => {
      const requeridas = o.habilidades.filter((h) => h.requerido);
      const totalReq = requeridas.length;
      const coincidencias = requeridas.filter((h) => mySkills.has(h.habilidadId)).length;
      const matchPct =
        totalReq === 0
          ? 100
          : Math.round((coincidencias / totalReq) * 10000) / 100;

      return {
        ofertaId: o.id,
        titulo: o.titulo,
        empresaNombre: o.empresa.nombreComercial,
        modalidad: o.modalidad,
        matchPct,
        habilidadesRequeridas: totalReq,
        habilidadesCoincidentes: coincidencias,
      };
    });

    recomendaciones.sort((a, b) => b.matchPct - a.matchPct);
    return recomendaciones.slice(0, 25);
  }
}
