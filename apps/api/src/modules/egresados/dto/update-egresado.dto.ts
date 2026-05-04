import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateEgresadoDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto.' })
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres.' })
  nombre?: string;

  @IsOptional()
  @IsString({ message: 'El apellido debe ser texto.' })
  @MaxLength(120, { message: 'El apellido no puede superar los 120 caracteres.' })
  apellido?: string;

  @IsOptional()
  @IsString({ message: 'El DNI debe ser texto.' })
  @MinLength(6, { message: 'El DNI debe tener al menos 6 caracteres.' })
  @MaxLength(20, { message: 'El DNI no puede superar los 20 caracteres.' })
  dni?: string;

  @IsOptional()
  @Type(() => Date)
  fechaNacimiento?: Date | null;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto.' })
  @MaxLength(40, { message: 'El teléfono no puede superar los 40 caracteres.' })
  telefono?: string | null;

  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto.' })
  @MaxLength(500, { message: 'La dirección no puede superar los 500 caracteres.' })
  direccion?: string | null;

  @IsOptional()
  @IsString({ message: 'La carrera debe ser texto.' })
  @MaxLength(200, { message: 'La carrera no puede superar los 200 caracteres.' })
  carrera?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El año de egreso debe ser un número entero.' })
  @Min(1950, { message: 'El año de egreso no es válido.' })
  anioEgreso?: number | null;

  @IsOptional()
  @IsUrl({}, { message: 'El CV debe ser una URL válida.' })
  cvUrl?: string | null;

  @IsOptional()
  @IsArray({ message: 'La formación académica debe ser un arreglo JSON.' })
  formacionAcademica?: Prisma.InputJsonValue;

  @IsOptional()
  @IsArray({ message: 'La experiencia laboral debe ser un arreglo JSON.' })
  experienciaLaboral?: Prisma.InputJsonValue;
}
