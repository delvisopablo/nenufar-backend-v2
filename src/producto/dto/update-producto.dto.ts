import {
  IsNotEmpty,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateProductoDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(160)
  nombre?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  descripcion?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  precio?: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(120)
  codigoSKU?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(120)
  codigoProducto?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  foto?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(0)
  stockDisponible?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(0)
  stockReservado?: number;
}
