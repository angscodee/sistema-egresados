import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

/**
 * Extracts JWT from:
 * 1. HttpOnly cookie `auth_token` (preferred — set by the API on login)
 * 2. Authorization: Bearer header (fallback for tRPC/REST clients that still
 *    send the header during the migration period)
 */
function extractJwtFromCookieOrHeader(req: Request): string | null {
  const fromCookie = req.cookies?.auth_token as string | undefined;
  if (fromCookie) return fromCookie;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET no está definido en el entorno.');
    }

    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload): Promise<Express.User> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Token inválido o usuario inexistente.');
    }

    return user;
  }
}
