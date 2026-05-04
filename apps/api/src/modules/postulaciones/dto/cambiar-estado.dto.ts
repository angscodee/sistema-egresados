import { EstadoPostulacion } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CambiarEstadoDto {
  @IsEnum(EstadoPostulacion, { message: 'El estado de postulación no es válido.' })
  @IsNotEmpty({ message: 'El nuevo estado es obligatorio.' })
  nuevoEstado!: EstadoPostulacion;

  @IsOptional()
  @IsString({ message: 'El motivo debe ser texto.' })
  @MaxLength(2000, { message: 'El motivo no puede superar los 2000 caracteres.' })
  motivo?: string;
}
