import type { Role } from '@prisma/client';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ExtractJwt } from 'passport-jwt';
import type { EgresadosService } from '../modules/egresados/egresados.service';
import type { EmpresasService } from '../modules/empresas/empresas.service';
import type { EstadisticasService } from '../modules/estadisticas/estadisticas.service';
import type { HabilidadesService } from '../modules/habilidades/habilidades.service';
import type { NotificacionesService } from '../modules/notificaciones/notificaciones.service';
import type { OfertasService } from '../modules/ofertas/ofertas.service';
import type { PostulacionesService } from '../modules/postulaciones/postulaciones.service';
import type { ReportesService } from '../modules/reportes/reportes.service';
import type { PrismaService } from '../prisma/prisma.service';

export type TrpcUser = {
  id: string;
  email: string;
  role: Role;
};

export type TrpcServices = {
  egresados: EgresadosService;
  empresas: EmpresasService;
  habilidades: HabilidadesService;
  ofertas: OfertasService;
  postulaciones: PostulacionesService;
  estadisticas: EstadisticasService;
  reportes: ReportesService;
  notificaciones: NotificacionesService;
};

export type TrpcContext = {
  req: Request;
  res: Response;
  prisma: PrismaService;
  user: TrpcUser | null;
} & TrpcServices;

type JwtPayloadShape = {
  sub: string;
  email: string;
  role: string;
};

export async function createTrpcContext(opts: {
  req: Request;
  res: Response;
  prisma: PrismaService;
  services: TrpcServices;
}): Promise<TrpcContext> {
  const { req, res, prisma, services } = opts;
  let user: TrpcUser | null = null;

  const secret = process.env.JWT_SECRET;

  // Extract token from HttpOnly cookie first, then fall back to Authorization header
  const fromCookie = req.cookies?.auth_token as string | undefined;
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  const token = secret ? (fromCookie ?? fromHeader ?? null) : null;

  if (token && secret) {
    try {
      const payload = jwt.verify(token, secret) as JwtPayloadShape;
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      });
      if (dbUser) {
        user = dbUser;
      }
    } catch {
      user = null;
    }
  }

  return {
    req,
    res,
    prisma,
    user,
    ...services,
  };
}
