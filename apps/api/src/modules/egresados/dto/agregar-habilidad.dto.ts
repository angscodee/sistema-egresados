import { NivelHabilidad } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export class AgregarHabilidadDto {
  @IsUUID('4', { message: 'El identificador de la habilidad debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'La habilidad es obligatoria.' })
  habilidadId!: string;

  @IsEnum(NivelHabilidad, { message: 'El nivel de habilidad no es válido.' })
  @IsNotEmpty({ message: 'El nivel es obligatorio.' })
  nivel!: NivelHabilidad;
}
