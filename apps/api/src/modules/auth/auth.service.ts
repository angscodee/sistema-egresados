import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const email = dto.email.toLowerCase().trim();

    // Derive a display name from the email prefix (e.g. "juan.perez@..." → "Juan Perez")
    const emailPrefix = email.split('@')[0];
    const displayName = emailPrefix
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: dto.role,
        // Create the role-specific profile automatically
        ...(dto.role === 'EGRESADO' && {
          egresado: {
            create: {
              nombre: displayName,
              apellido: '',
              dni: '',
              carrera: '',
              anioEgreso: new Date().getFullYear(),
            },
          },
        }),
        ...(dto.role === 'EMPRESA' && {
          empresa: {
            create: {
              nombreComercial: displayName,
              razonSocial: displayName,
              ruc: '',
              sector: '',
            },
          },
        }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as Role,
      },
    };
  }
}
