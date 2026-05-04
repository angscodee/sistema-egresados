import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RechazarEmpresaDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo de rechazo es obligatorio.' })
  @MaxLength(1000, { message: 'El motivo no puede superar los 1000 caracteres.' })
  motivo!: string;
}
