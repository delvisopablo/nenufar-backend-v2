import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateResenaDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  puntuacion?: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(2000)
  contenido?: string;

  @IsBoolean()
  @IsOptional()
  selloNenufar?: boolean; // 👈 añadido
}
