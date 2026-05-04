import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEgresadoDto {
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres.' })
  nombre!: string;

  @IsString({ message: 'El apellido debe ser texto.' })
  @IsNotEmpty({ message: 'El apellido es obligatorio.' })
  @MaxLength(120, { message: 'El apellido no puede superar los 120 caracteres.' })
  apellido!: string;

  @IsString({ message: 'El DNI debe ser texto.' })
  @IsNotEmpty({ message: 'El DNI es obligatorio.' })
  @MinLength(6, { message: 'El DNI debe tener al menos 6 caracteres.' })
  @MaxLength(20, { message: 'El DNI no puede superar los 20 caracteres.' })
  dni!: string;

  @IsOptional()
  @Type(() => Date)
  fechaNacimiento?: Date;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto.' })
  @MaxLength(40, { message: 'El teléfono no puede superar los 40 caracteres.' })
  telefono?: string;

  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto.' })
  @MaxLength(500, { message: 'La dirección no puede superar los 500 caracteres.' })
  direccion?: string;

  @IsOptional()
  @IsString({ message: 'La carrera debe ser texto.' })
  @MaxLength(200, { message: 'La carrera no puede superar los 200 caracteres.' })
  carrera?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El año de egreso debe ser un número entero.' })
  @Min(1950, { message: 'El año de egreso no es válido.' })
  anioEgreso?: number;

  @IsOptional()
  @IsUrl({}, { message: 'El CV debe ser una URL válida.' })
  cvUrl?: string;

  @IsOptional()
  @IsArray({ message: 'La formación académica debe ser un arreglo JSON.' })
  formacionAcademica?: Prisma.InputJsonValue;

  @IsOptional()
  @IsArray({ message: 'La experiencia laboral debe ser un arreglo JSON.' })
  experienciaLaboral?: Prisma.InputJsonValue;
}
