import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateNegocioDto {
  @IsString()
  @MaxLength(120)
  nombre!: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  slug?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  historia?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nenufarColor?: string;

  @IsDateString()
  fechaFundacion!: string; // ISO: "YYYY-MM-DD" o fecha completa

  @IsString()
  @IsOptional()
  @MaxLength(255)
  direccion?: string;

  @IsInt()
  categoriaId!: number;

  @IsInt()
  @IsOptional()
  subcategoriaId?: number;

  @IsInt()
  @IsOptional()
  @Min(5)
  intervaloReserva?: number;

  @IsOptional()
  horario?: any; // JSON { weekly, exceptions }
}
