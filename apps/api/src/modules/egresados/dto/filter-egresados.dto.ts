import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class FilterEgresadosDto {
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
  @IsString({ message: 'La carrera debe ser texto.' })
  carrera?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El año de egreso debe ser un entero.' })
  anioEgreso?: number;

  @IsOptional()
  @IsArray({ message: 'Las habilidades deben enviarse como arreglo de identificadores.' })
  @IsUUID('4', { each: true, message: 'Cada habilidad debe ser un UUID válido.' })
  habilidades?: string[];
}
