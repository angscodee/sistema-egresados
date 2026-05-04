import { Modalidad, TipoContrato } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class FilterOfertasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El desplazamiento debe ser un entero.' })
  @Min(0, { message: 'El desplazamiento no puede ser negativo.' })
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un entero.' })
  @Min(1, { message: 'El límite debe ser al menos 1.' })
  @Max(100, { message: 'El límite no puede superar 100.' })
  take?: number;

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
  salarioMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El salario máximo debe ser numérico.' })
  @Min(0, { message: 'El salario máximo no puede ser negativo.' })
  salarioMax?: number;

  @IsOptional()
  @IsString({ message: 'La ubicación debe ser texto.' })
  ubicacion?: string;

  @IsOptional()
  @IsArray({ message: 'Las habilidades deben enviarse como arreglo de identificadores.' })
  @IsUUID('4', { each: true, message: 'Cada habilidad debe ser un UUID válido.' })
  habilidades?: string[];
}
