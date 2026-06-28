import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReservaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  negocioId?: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty()
  @IsDateString()
  fecha!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(500)
  nota?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  recursoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duracionMinutos?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numPersonas?: number;
}
