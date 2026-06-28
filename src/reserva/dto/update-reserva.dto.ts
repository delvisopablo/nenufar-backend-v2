import { Transform, Type } from 'class-transformer';
import { ReservaEstado } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateReservaDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  nota?: string;

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

  @IsOptional()
  @IsEnum(ReservaEstado)
  estado?: ReservaEstado;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoCancelacion?: string;
}
