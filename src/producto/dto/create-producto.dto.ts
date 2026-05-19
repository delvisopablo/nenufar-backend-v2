import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombre!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  descripcion?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio!: number;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  codigoSKU?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  codigoProducto?: string;

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
