import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateNegocioDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(160)
  slug?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  historia?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nenufarColor?: string;

  @IsNotEmpty()
  @IsDateString()
  fechaFundacion!: string; // ISO: "YYYY-MM-DD" o fecha completa

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(255)
  direccion?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(255)
  web?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  emailContacto?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @Matches(/^[+()\d\s.-]{6,25}$/)
  telefono?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoriaId!: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  subcategoriaId?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  intervaloReserva?: number;

  @IsOptional()
  @IsObject()
  horario?: any; // JSON { weekly, exceptions }

  @IsOptional()
  @IsBoolean()
  reservasActivas?: boolean;
}
