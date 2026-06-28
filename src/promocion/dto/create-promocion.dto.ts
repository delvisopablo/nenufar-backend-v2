import {
  IsBoolean,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsArray,
  IsNumber,
  IsNotEmpty,
  Min,
  IsEnum,
  MaxLength,
  ArrayUnique,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ContenidoEstado, TipoDescuento } from '@prisma/client';

export class CreatePromocionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  titulo: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsNotEmpty()
  @IsDateString()
  fechaCaducidad: string; // 👈 ISO date

  @Type(() => Number)
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
  @IsEnum(ContenidoEstado)
  estado?: ContenidoEstado;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productoId?: number; // producto principal

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  packIds?: number[]; // lista de IDs de productos para el pack

  @Type(() => Number)
  @IsInt()
  @Min(1)
  negocioId: number;
}
