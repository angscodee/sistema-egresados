import { IsNotEmpty, IsUUID } from 'class-validator';

export class PostularDto {
  @IsUUID('4', { message: 'El identificador de la oferta debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'La oferta es obligatoria.' })
  ofertaId!: string;
}
