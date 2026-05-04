import { TipoHabilidad } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateHabilidadDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsEnum(TipoHabilidad)
  tipo?: TipoHabilidad;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoria?: string | null;
}
