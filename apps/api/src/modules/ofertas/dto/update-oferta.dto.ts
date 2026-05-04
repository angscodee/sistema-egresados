import { Modalidad, TipoContrato } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateOfertaDto {
  @IsOptional()
  @IsString({ message: 'El título debe ser texto.' })
  @MaxLength(200, { message: 'El título no puede superar los 200 caracteres.' })
  titulo?: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto.' })
  @MaxLength(20000, { message: 'La descripción es demasiado extensa.' })
  descripcion?: string;

  @IsOptional()
  @IsString({ message: 'La ubicación debe ser texto.' })
  @MaxLength(200, { message: 'La ubicación no puede superar los 200 caracteres.' })
  ubicacion?: string | null;

  @IsOptional()
  @IsEnum(Modalidad, { message: 'La modalidad no es válida.' })
  modalidad?: Modalidad;

  @IsOptional()
  @IsEnum(TipoContrato, { message: 'El tipo de contrato no es válido.' })
  tipoContrato?: TipoContrato;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El salario mínimo debe ser numérico.' })
  @Min(0, { message: 'El salario mínimo no puede ser negativo.' })
  salarioMin?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El salario máximo debe ser numérico.' })
  @Min(0, { message: 'El salario máximo no puede ser negativo.' })
  salarioMax?: number | null;

  @IsOptional()
  @Type(() => Date)
  fechaCierre?: Date | null;
}
