import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsArray,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class CreatePromocionDto {
  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsDateString()
  fechaCaducidad: string; // 👈 ISO date

  @IsNumber()
  @Min(0)
  @Max(100)
  descuento: number;

  @IsOptional()
  @IsInt()
  productoId?: number; // producto principal

  @IsOptional()
  @IsArray()
  packIds?: number[]; // lista de IDs de productos para el pack

  @IsInt()
  negocioId: number;
}
