import {
  IsBoolean,
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsInt,
  IsArray,
  IsNotEmpty,
  Min,
  IsEnum,
  MaxLength,
  ArrayUnique,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ContenidoEstado, TipoDescuento } from '@prisma/client';

export class UpdatePromocionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
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
  @Type(() => Number)
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
  @IsEnum(ContenidoEstado)
  estado?: ContenidoEstado;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productoId?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  packIds?: number[];
}
