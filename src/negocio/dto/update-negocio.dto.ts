import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateNegocioDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(120)
  nombre?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(160)
  slug?: string | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  historia?: string | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(280)
  descripcionCorta?: string | null;

  @IsDateString()
  @IsOptional()
  fechaFundacion?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(255)
  direccion?: string | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(255)
  fotoPerfil?: string | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(255)
  fotoPortada?: string | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nenufarColor?: string | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(80)
  nenufarKey?: string | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nenufarAsset?: string | null;

  @IsInt()
  @IsOptional()
  categoriaId?: number;

  @IsInt()
  @IsOptional()
  subcategoriaId?: number;

  @IsInt()
  @IsOptional()
  @Min(5)
  intervaloReserva?: number;

  @IsOptional()
  horario?: any;
}
