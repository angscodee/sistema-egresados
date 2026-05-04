import { Modalidad, TipoContrato } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OfertaHabilidadItemDto {
  @IsUUID('4', { message: 'El identificador de la habilidad debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'La habilidad es obligatoria.' })
  habilidadId!: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo requerido debe ser verdadero o falso.' })
  requerido?: boolean;
}

export class CreateOfertaDto {
  @IsString({ message: 'El título debe ser texto.' })
  @IsNotEmpty({ message: 'El título es obligatorio.' })
  @MaxLength(200, { message: 'El título no puede superar los 200 caracteres.' })
  titulo!: string;

  @IsString({ message: 'La descripción debe ser texto.' })
  @IsNotEmpty({ message: 'La descripción es obligatoria.' })
  @MaxLength(20000, { message: 'La descripción es demasiado extensa.' })
  descripcion!: string;

  @IsOptional()
  @IsString({ message: 'La ubicación debe ser texto.' })
  @MaxLength(200, { message: 'La ubicación no puede superar los 200 caracteres.' })
  ubicacion?: string;

  @IsEnum(Modalidad, { message: 'La modalidad no es válida.' })
  @IsNotEmpty({ message: 'La modalidad es obligatoria.' })
  modalidad!: Modalidad;

  @IsEnum(TipoContrato, { message: 'El tipo de contrato no es válido.' })
  @IsNotEmpty({ message: 'El tipo de contrato es obligatorio.' })
  tipoContrato!: TipoContrato;

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
  @Type(() => Date)
  fechaCierre?: Date;

  @IsOptional()
  @IsArray({ message: 'Las habilidades deben enviarse como arreglo.' })
  @ArrayMinSize(1, { message: 'Si envía habilidades, debe incluir al menos una.' })
  @ValidateNested({ each: true })
  @Type(() => OfertaHabilidadItemDto)
  habilidades?: OfertaHabilidadItemDto[];
}
