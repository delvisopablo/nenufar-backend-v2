import {
  IsBoolean,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsArray,
  IsNumber,
  Min,
  IsEnum,
  MaxLength,
  IsPositive,
  ArrayUnique,
  IsString as IsStringEach,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TipoDescuento } from '@prisma/client';

export class CreatePromocionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  titulo: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsDateString()
  fechaCaducidad: string; // 👈 ISO date

  @IsNumber()
  @Min(0)
  descuento: number;

  @IsOptional()
  @IsEnum(TipoDescuento)
  tipoDescuento?: TipoDescuento;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockMaximo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  usosMaximos?: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(191)
  codigo?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productoId?: number; // producto principal

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  packIds?: number[]; // lista de IDs de productos para el pack

  @Type(() => Number)
  @IsInt()
  negocioId: number;
}
