import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EstadisticasService } from './estadisticas.service';
import { EstadoOferta, EstadoPostulacion } from '@prisma/client';

// ── Minimal Prisma mock ───────────────────────────────────────────────────────
function makePrisma() {
  return {
    egresado: {
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    empresa: { count: vi.fn().mockResolvedValue(0) },
    ofertaLaboral: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    postulacion: {
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockResolvedValue([]),
    },
    ofertaHabilidad: { groupBy: vi.fn().mockResolvedValue([]) },
    habilidad: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

describe('EstadisticasService', () => {
  let service: EstadisticasService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new EstadisticasService(prisma as never);
  });

  // ── getAdminDashboard ───────────────────────────────────────────────────────
  describe('getAdminDashboard', () => {
    it('retorna la estructura correcta con kpis y graficas', async () => {
      prisma.egresado.count.mockResolvedValue(10);
      prisma.empresa.count.mockResolvedValue(3);
      prisma.ofertaLaboral.count.mockResolvedValue(5);
      prisma.postulacion.groupBy.mockResolvedValue([
        { egresadoId: 'a' },
        { egresadoId: 'b' },
      ]);

      const result = await service.getAdminDashboard({});

      expect(result).toHaveProperty('kpis');
      expect(result).toHaveProperty('graficas');
      expect(result.kpis.totalEgresados).toBe(10);
      expect(result.kpis.totalEmpresas).toBe(3);
      expect(result.kpis.ofertasActivas).toBe(5);
      expect(result.kpis.tasaEmpleabilidad).toBe(20); // 2/10 * 100
    });

    it('retorna tasaEmpleabilidad 0 cuando no hay egresados', async () => {
      prisma.egresado.count.mockResolvedValue(0);
      prisma.postulacion.groupBy.mockResolvedValue([]);

      const result = await service.getAdminDashboard({});

      expect(result.kpis.tasaEmpleabilidad).toBe(0);
    });

    it('graficas contiene las 4 series esperadas', async () => {
      const result = await service.getAdminDashboard({});

      expect(result.graficas).toHaveProperty('ofertasVsPostulacionesMensual');
      expect(result.graficas).toHaveProperty('egresadosPorCarrera');
      expect(result.graficas).toHaveProperty('topHabilidadesDemandadas');
      expect(result.graficas).toHaveProperty('tasaContratacionPorCohorte');
      expect(Array.isArray(result.graficas.ofertasVsPostulacionesMensual)).toBe(true);
    });
  });

  // ── calcularTasaEmpleabilidad (via getAdminDashboard) ──────────────────────
  describe('calcularTasaEmpleabilidad', () => {
    it('calcula correctamente el porcentaje', async () => {
      prisma.egresado.count.mockResolvedValue(4);
      prisma.postulacion.groupBy.mockResolvedValue([
        { egresadoId: 'x' },
      ]);

      const result = await service.getAdminDashboard({});
      // 1 contratado / 4 egresados = 25%
      expect(result.kpis.tasaEmpleabilidad).toBe(25);
    });
  });

  // ── getEgresadoDashboard ────────────────────────────────────────────────────
  describe('getEgresadoDashboard', () => {
    it('lanza NotFoundException si el egresado no existe', async () => {
      prisma.egresado.findUnique.mockResolvedValue(null);

      await expect(service.getEgresadoDashboard('non-existent-id')).rejects.toThrow(
        'No se encontró el egresado indicado.',
      );
    });

    it('retorna recomendaciones filtradas (sin ofertas ya postuladas)', async () => {
      const egresadoId = 'egresado-1';
      prisma.egresado.findUnique.mockResolvedValue({
        id: egresadoId,
        habilidades: [{ habilidadId: 'hab-1' }],
      });
      prisma.postulacion.count.mockResolvedValue(0);
      prisma.postulacion.groupBy.mockResolvedValue([]);
      prisma.postulacion.findMany.mockResolvedValue([
        { ofertaId: 'oferta-ya-postulada' },
      ]);
      prisma.ofertaLaboral.findMany.mockResolvedValue([
        {
          id: 'oferta-nueva',
          titulo: 'Dev Backend',
          modalidad: 'REMOTO',
          estado: EstadoOferta.ACTIVA,
          habilidades: [{ habilidadId: 'hab-1', requerido: true }],
          empresa: { nombreComercial: 'TechCorp' },
        },
      ]);

      const result = await service.getEgresadoDashboard(egresadoId);

      // La oferta ya postulada no debe aparecer en recomendaciones
      const ids = result.recomendaciones.map((r) => r.ofertaId);
      expect(ids).not.toContain('oferta-ya-postulada');
      expect(ids).toContain('oferta-nueva');
    });
  });
});
