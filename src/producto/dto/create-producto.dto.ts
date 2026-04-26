import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombre!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  descripcion?: string;

  @IsNumber()
  @Min(0)
  precio!: number;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  codigoSKU?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  stockDisponible?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  stockReservado?: number;
}
