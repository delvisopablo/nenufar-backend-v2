import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductoDto {
  @IsString()
  @IsOptional()
  @MaxLength(160)
  nombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  descripcion?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  precio?: number;

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
