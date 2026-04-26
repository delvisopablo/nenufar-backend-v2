import {
  IsBoolean,
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsInt,
  IsArray,
  Min,
  IsEnum,
  MaxLength,
  ArrayUnique,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TipoDescuento } from '@prisma/client';

export class UpdatePromocionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  titulo?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaCaducidad?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  descuento?: number;

  @IsOptional()
  @IsEnum(TipoDescuento)
  tipoDescuento?: TipoDescuento;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(191)
  codigo?: string;

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

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productoId?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  packIds?: number[];
}
