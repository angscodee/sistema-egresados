import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { EstadoOferta, EstadoPostulacion, Role } from '@prisma/client';
import { PostulacionesService } from './postulaciones.service';

// ── Mocks ─────────────────────────────────────────────────────────────────────
function makePrisma() {
  return {
    ofertaLaboral: { findUnique: vi.fn() },
    egresado: { findUnique: vi.fn() },
    postulacion: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    historialEstado: { create: vi.fn() },
    user: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
  };
}

const mockNotificaciones = { crearSeguro: vi.fn().mockResolvedValue(undefined) };
const mockEmail = {
  sendPostulacionConfirmacion: vi.fn().mockResolvedValue(undefined),
  sendCambioEstadoPostulacion: vi.fn().mockResolvedValue(undefined),
};

const adminUser = { id: 'admin-1', email: 'admin@test.com', role: Role.ADMIN };
const empresaUser = { id: 'empresa-1', email: 'empresa@test.com', role: Role.EMPRESA };

describe('PostulacionesService', () => {
  let service: PostulacionesService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PostulacionesService(
      prisma as never,
      mockNotificaciones as never,
      mockEmail as never,
    );
    vi.clearAllMocks();
  });

  // ── postular ────────────────────────────────────────────────────────────────
  describe('postular', () => {
    it('lanza ConflictException si ya existe una postulación duplicada', async () => {
      prisma.ofertaLaboral.findUnique.mockResolvedValue({
        id: 'oferta-1',
        estado: EstadoOferta.ACTIVA,
        titulo: 'Dev',
        empresa: { id: 'emp-1', nombreComercial: 'Corp' },
      });
      prisma.egresado.findUnique.mockResolvedValue({ id: 'egresado-1', nombre: 'Juan', apellido: 'Pérez' });
      prisma.postulacion.findUnique.mockResolvedValue({ id: 'existing-postulacion' });

      await expect(service.postular('egresado-1', 'oferta-1')).rejects.toThrow(ConflictException);
    });

    it('lanza ConflictException si la oferta no está activa', async () => {
      prisma.ofertaLaboral.findUnique.mockResolvedValue({
        id: 'oferta-1',
        estado: EstadoOferta.CERRADA,
        titulo: 'Dev',
        empresa: { id: 'emp-1', nombreComercial: 'Corp' },
      });

      await expect(service.postular('egresado-1', 'oferta-1')).rejects.toThrow(ConflictException);
    });

    it('lanza NotFoundException si la oferta no existe', async () => {
      prisma.ofertaLaboral.findUnique.mockResolvedValue(null);

      await expect(service.postular('egresado-1', 'oferta-inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  // ── cambiarEstado ───────────────────────────────────────────────────────────
  describe('cambiarEstado', () => {
    const basePostulacion = {
      id: 'post-1',
      ofertaId: 'oferta-1',
      egresadoId: 'egresado-1',
      estado: EstadoPostulacion.POSTULADO,
      oferta: { empresaId: 'empresa-1', titulo: 'Dev Backend' },
      egresado: { id: 'egresado-1', nombre: 'Juan', apellido: 'Pérez' },
    };

    it('registra historial al cambiar estado', async () => {
      prisma.postulacion.findUnique.mockResolvedValue(basePostulacion);
      prisma.postulacion.findUniqueOrThrow.mockResolvedValue({
        ...basePostulacion,
        estado: EstadoPostulacion.EN_REVISION,
        historial: [],
      });

      await service.cambiarEstado('post-1', EstadoPostulacion.EN_REVISION, adminUser);

      expect(prisma.$transaction).toHaveBeenCalled();
      // The transaction includes historialEstado.create
      const txCalls = (prisma.$transaction as ReturnType<typeof vi.fn>).mock.calls[0][0] as unknown[];
      expect(txCalls).toHaveLength(2);
    });

    it('lanza BadRequestException si el estado retrocede', async () => {
      prisma.postulacion.findUnique.mockResolvedValue({
        ...basePostulacion,
        estado: EstadoPostulacion.ENTREVISTA,
      });

      await expect(
        service.cambiarEstado('post-1', EstadoPostulacion.POSTULADO, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el estado es terminal (CONTRATADO)', async () => {
      prisma.postulacion.findUnique.mockResolvedValue({
        ...basePostulacion,
        estado: EstadoPostulacion.CONTRATADO,
      });

      await expect(
        service.cambiarEstado('post-1', EstadoPostulacion.EN_REVISION, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si el estado es terminal (RECHAZADO)', async () => {
      prisma.postulacion.findUnique.mockResolvedValue({
        ...basePostulacion,
        estado: EstadoPostulacion.RECHAZADO,
      });

      await expect(
        service.cambiarEstado('post-1', EstadoPostulacion.ENTREVISTA, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite RECHAZADO desde cualquier estado no terminal', async () => {
      prisma.postulacion.findUnique.mockResolvedValue({
        ...basePostulacion,
        estado: EstadoPostulacion.ENTREVISTA,
      });
      prisma.postulacion.findUniqueOrThrow.mockResolvedValue({
        ...basePostulacion,
        estado: EstadoPostulacion.RECHAZADO,
        historial: [],
      });

      const result = await service.cambiarEstado('post-1', EstadoPostulacion.RECHAZADO, adminUser);
      expect(result).toBeDefined();
    });

    it('lanza ForbiddenException si empresa intenta cambiar estado de oferta ajena', async () => {
      prisma.postulacion.findUnique.mockResolvedValue({
        ...basePostulacion,
        oferta: { empresaId: 'otra-empresa', titulo: 'Dev' },
      });

      const otraEmpresa = { id: 'empresa-2', email: 'otra@test.com', role: Role.EMPRESA };
      await expect(
        service.cambiarEstado('post-1', EstadoPostulacion.EN_REVISION, otraEmpresa),
      ).rejects.toThrow();
    });
  });
});
