import { TipoHabilidad } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateHabilidadDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres.' })
  nombre!: string;

  @IsEnum(TipoHabilidad, { message: 'El tipo debe ser TECNICA o BLANDA.' })
  @IsNotEmpty({ message: 'El tipo es obligatorio.' })
  tipo!: TipoHabilidad;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoria?: string;
}
