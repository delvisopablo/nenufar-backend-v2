import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Dificultad, LogroCategoria, LogroTipo } from '@prisma/client';

export class CreateLogroDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  descripcion?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  accion?: string;

  @IsEnum(LogroTipo)
  tipo: LogroTipo;

  @IsOptional()
  @IsEnum(LogroCategoria)
  categoriaLogro?: LogroCategoria;

  @IsOptional()
  @IsBoolean()
  oculto?: boolean;

  @IsOptional()
  @IsBoolean()
  esFinal?: boolean;

  @IsEnum(Dificultad)
  dificultad: Dificultad = Dificultad.FACIL;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  umbral: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  recompensaPuntos?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  recompensaPetalos?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoriaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subcategoriaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  negocioId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productoId?: number;
}
