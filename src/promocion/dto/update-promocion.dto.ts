import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsInt,
  IsArray,
  Max,
  Min,
} from 'class-validator';

export class UpdatePromocionDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fechaCaducidad?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  descuento?: number;

  @IsOptional()
  @IsInt()
  productoId?: number;

  @IsOptional()
  @IsArray()
  packIds?: number[];
}
