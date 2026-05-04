import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateEmpresaDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreComercial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  razonSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  ruc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sector?: string | null;

  @IsOptional()
  @IsUrl()
  sitioWeb?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string | null;

  @IsOptional()
  @IsUrl()
  logoUrl?: string | null;
}
