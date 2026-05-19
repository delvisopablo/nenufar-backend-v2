import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductoSugeridoResenaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioSugerido?: number;
}

export class CreateResenaDto {
  @IsInt() negocioId!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  puntuacion!: number;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  contenido?: string;

  @IsBoolean()
  @IsOptional()
  selloNenufar?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  productoIds?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoSugeridoResenaDto)
  productosSugeridos?: ProductoSugeridoResenaDto[];
}
