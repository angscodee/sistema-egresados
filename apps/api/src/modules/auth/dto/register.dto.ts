import type { Role } from '@prisma/client';
import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

const REGISTER_ROLES = ['EGRESADO', 'EMPRESA'] as const satisfies readonly Role[];

export class RegisterDto {
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido.' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  email!: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password!: string;

  @IsIn(REGISTER_ROLES, {
    message: 'Solo se permite registrarse como egresado o empresa.',
  })
  @IsNotEmpty({ message: 'El rol es obligatorio.' })
  role!: Extract<Role, (typeof REGISTER_ROLES)[number]>;
}
