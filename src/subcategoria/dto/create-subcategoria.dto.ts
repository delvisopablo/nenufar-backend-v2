import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSubcategoriaDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(191)
  nombre!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoriaId!: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
