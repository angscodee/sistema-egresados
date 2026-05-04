import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoOferta, EstadoPostulacion, Role, type Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notificaciones/email.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

// ── Estado flow validation ────────────────────────────────────────────────────
// Defines which transitions are allowed. A state can only move forward.
const ESTADO_ORDER: Record<EstadoPostulacion, number> = {
  [EstadoPostulacion.POSTULADO]: 0,
  [EstadoPostulacion.EN_REVISION]: 1,
  [EstadoPostulacion.ENTREVISTA]: 2,
  [EstadoPostulacion.CONTRATADO]: 3,
  [EstadoPostulacion.RECHAZADO]: 3, // terminal — same level as CONTRATADO
};

// RECHAZADO can be reached from any non-terminal state
function isTransicionValida(
  actual: EstadoPostulacion,
  nuevo: EstadoPostulacion,
): boolean {
  if (actual === nuevo) return true;
  // Terminal states cannot transition further
  if (
    actual === EstadoPostulacion.CONTRATADO ||
    actual === EstadoPostulacion.RECHAZADO
  ) {
    return false;
  }
  // RECHAZADO is always reachable from non-terminal states
  if (nuevo === EstadoPostulacion.RECHAZADO) return true;
  // Otherwise must move forward
  return ESTADO_ORDER[nuevo] > ESTADO_ORDER[actual];
}

function labelEstadoPostulacion(estado: EstadoPostulacion): string {
  switch (estado) {
    case EstadoPostulacion.POSTULADO:
      return 'Postulado';
    case EstadoPostulacion.EN_REVISION:
      return 'En revisión';
    case EstadoPostulacion.ENTREVISTA:
      return 'Entrevista';
    case EstadoPostulacion.CONTRATADO:
      return 'Contratado';
    case EstadoPostulacion.RECHAZADO:
      return 'Rechazado';
    default:
      return estado;
  }
}

@Injectable()
export class PostulacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly email: EmailService,
  ) {}

  async postular(egresadoId: string, ofertaId: string) {
    const oferta = await this.prisma.ofertaLaboral.findUnique({
      where: { id: ofertaId },
      select: {
        id: true,
        estado: true,
        titulo: true,
        empresa: { select: { id: true, nombreComercial: true } },
      },
    });
    if (!oferta) {
      throw new NotFoundException('No se encontró la oferta indicada.');
    }
    if (oferta.estado !== EstadoOferta.ACTIVA) {
      throw new ConflictException('Esta oferta no acepta nuevas postulaciones.');
    }

    const egresado = await this.prisma.egresado.findUnique({
      where: { id: egresadoId },
      select: { id: true, nombre: true, apellido: true },
    });
    if (!egresado) {
      throw new NotFoundException('No se encontró el perfil de egresado.');
    }

    const existente = await this.prisma.postulacion.findUnique({
      where: { ofertaId_egresadoId: { ofertaId, egresadoId } },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException('Ya se postuló a esta oferta.');
    }

    const postulacion = await this.prisma.postulacion.create({
      data: {
        ofertaId,
        egresadoId,
        estado: EstadoPostulacion.POSTULADO,
      },
      include: {
        oferta: {
          select: { id: true, titulo: true, estado: true, empresaId: true },
        },
        historial: { orderBy: { createdAt: 'desc' } },
      },
    });

    // Notify egresado in-app
    await this.notificaciones.crearSeguro(
      egresadoId,
      'POSTULACION_CREADA',
      'Postulación enviada',
      `Tu postulación a «${oferta.titulo}» fue enviada correctamente.`,
      { postulacionId: postulacion.id, ofertaId },
    );

    // Send confirmation email (non-blocking)
    const userRow = await this.prisma.user.findUnique({
      where: { id: egresadoId },
      select: { email: true },
    });
    if (userRow?.email) {
      void this.email.sendPostulacionConfirmacion({
        to: userRow.email,
        egresadoNombre: `${egresado.nombre} ${egresado.apellido}`.trim(),
        ofertaTitulo: oferta.titulo,
        empresaNombre: oferta.empresa.nombreComercial,
      });
    }

    return postulacion;
  }

  async cambiarEstado(
    postulacionId: string,
    nuevoEstado: EstadoPostulacion,
    currentUser: Express.User,
    motivo?: string,
  ) {
    const postulacion = await this.prisma.postulacion.findUnique({
      where: { id: postulacionId },
      include: {
        oferta: { select: { empresaId: true, titulo: true } },
        egresado: { select: { id: true, nombre: true, apellido: true } },
      },
    });

    if (!postulacion) {
      throw new NotFoundException('No se encontró la postulación indicada.');
    }

    if (currentUser.role === Role.ADMIN) {
      // permitido
    } else if (currentUser.role === Role.EMPRESA && currentUser.id === postulacion.oferta.empresaId) {
      // permitido
    } else {
      throw new ForbiddenException('No tiene permiso para modificar el estado de esta postulación.');
    }

    // ── Validate state flow ──────────────────────────────────────────────────
    if (!isTransicionValida(postulacion.estado, nuevoEstado)) {
      throw new BadRequestException(
        `No se puede cambiar el estado de "${postulacion.estado}" a "${nuevoEstado}". ` +
          `Los estados terminales (CONTRATADO, RECHAZADO) no pueden modificarse, ` +
          `y el flujo solo puede avanzar.`,
      );
    }

    if (postulacion.estado === nuevoEstado) {
      return this.prisma.postulacion.findUniqueOrThrow({
        where: { id: postulacionId },
        include: {
          oferta: { select: { id: true, titulo: true, empresaId: true } },
          egresado: { select: { id: true, nombre: true, apellido: true, carrera: true } },
          historial: { orderBy: { createdAt: 'desc' } },
        },
      });
    }

    await this.prisma.$transaction([
      this.prisma.historialEstado.create({
        data: {
          postulacionId,
          estadoAnterior: postulacion.estado,
          estadoNuevo: nuevoEstado,
          motivo: motivo?.trim() || null,
        },
      }),
      this.prisma.postulacion.update({
        where: { id: postulacionId },
        data: { estado: nuevoEstado },
      }),
    ]);

    const estadoLabel = labelEstadoPostulacion(nuevoEstado);
    const metadata: Prisma.InputJsonValue = {
      postulacionId,
      ofertaId: postulacion.ofertaId,
      estadoAnterior: postulacion.estado,
      estadoNuevo: nuevoEstado,
      motivo: motivo?.trim() || null,
    };

    // In-app notification
    await this.notificaciones.crearSeguro(
      postulacion.egresadoId,
      'POSTULACION_ESTADO',
      'Cambio en tu postulación',
      `Tu postulación a «${postulacion.oferta.titulo}» pasó a: ${estadoLabel}.`,
      metadata,
    );

    // Email notification (non-blocking)
    const userRow = await this.prisma.user.findUnique({
      where: { id: postulacion.egresadoId },
      select: { email: true },
    });
    if (userRow?.email) {
      void this.email.sendCambioEstadoPostulacion({
        to: userRow.email,
        egresadoNombre: `${postulacion.egresado.nombre} ${postulacion.egresado.apellido}`.trim(),
        ofertaTitulo: postulacion.oferta.titulo,
        estadoLabel,
        motivo: motivo?.trim() || null,
      });
    }

    return this.prisma.postulacion.findUniqueOrThrow({
      where: { id: postulacionId },
      include: {
        oferta: { select: { id: true, titulo: true, empresaId: true } },
        egresado: { select: { id: true, nombre: true, apellido: true, carrera: true } },
        historial: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async getPostulacionDetalle(postulacionId: string, usuarioId: string) {
    const postulacion = await this.prisma.postulacion.findUnique({
      where: { id: postulacionId },
      include: {
        oferta: {
          include: {
            empresa: { select: { id: true, nombreComercial: true, logoUrl: true, sector: true, sitioWeb: true, descripcion: true } },
            habilidades: { include: { habilidad: true } },
          },
        },
        egresado: {
          include: {
            habilidades: { include: { habilidad: true } },
          },
        },
        historial: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!postulacion) {
      throw new NotFoundException('No se encontró la postulación indicada.');
    }

    // Egresado can only see their own; empresa can only see postulaciones to their offers
    const user = await this.prisma.user.findUnique({
      where: { id: usuarioId },
      select: { role: true },
    });

    if (user?.role === Role.EGRESADO && postulacion.egresadoId !== usuarioId) {
      throw new ForbiddenException('No tiene permiso para ver esta postulación.');
    }
    if (user?.role === Role.EMPRESA && postulacion.oferta.empresaId !== usuarioId) {
      throw new ForbiddenException('No tiene permiso para ver esta postulación.');
    }

    const matchPct = await this.calcularMatchHabilidades(postulacion.egresadoId, postulacion.ofertaId);

    return { ...postulacion, matchPct };
  }

  async calcularMatchHabilidades(egresadoId: string, ofertaId: string): Promise<number> {
    const oferta = await this.prisma.ofertaLaboral.findUnique({
      where: { id: ofertaId },
      select: { habilidades: { select: { habilidadId: true, requerido: true } } },
    });

    if (!oferta || oferta.habilidades.length === 0) return 100;

    const egresado = await this.prisma.egresado.findUnique({
      where: { id: egresadoId },
      select: { habilidades: { select: { habilidadId: true } } },
    });

    if (!egresado) return 0;

    const egresadoIds = new Set(egresado.habilidades.map((h) => h.habilidadId));
    const requeridas = oferta.habilidades.filter((h) => h.requerido);
    const total = requeridas.length > 0 ? requeridas : oferta.habilidades;
    const matches = total.filter((h) => egresadoIds.has(h.habilidadId)).length;

    return Math.round((matches / total.length) * 100);
  }

  async getMisPostulaciones(egresadoId: string) {
    const egresado = await this.prisma.egresado.findUnique({
      where: { id: egresadoId },
      select: { id: true },
    });
    if (!egresado) {
      throw new NotFoundException('No se encontró el perfil de egresado.');
    }

    return this.prisma.postulacion.findMany({
      where: { egresadoId },
      orderBy: { createdAt: 'desc' },
      include: {
        oferta: {
          include: {
            empresa: { select: { id: true, nombreComercial: true, logoUrl: true } },
          },
        },
        historial: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async getPostulantesPorOferta(ofertaId: string, empresaId: string) {
    const oferta = await this.prisma.ofertaLaboral.findUnique({
      where: { id: ofertaId },
      select: { id: true, empresaId: true },
    });
    if (!oferta) {
      throw new NotFoundException('No se encontró la oferta indicada.');
    }
    if (oferta.empresaId !== empresaId) {
      throw new ForbiddenException('Solo la empresa publicadora puede ver las postulaciones de esta oferta.');
    }

    return this.prisma.postulacion.findMany({
      where: { ofertaId },
      orderBy: { createdAt: 'desc' },
      include: {
        egresado: {
          include: {
            habilidades: { include: { habilidad: true } },
          },
        },
        historial: { orderBy: { createdAt: 'desc' } },
      },
    });
  }
}
