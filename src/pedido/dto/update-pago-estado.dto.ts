import { PagoEstado } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePagoEstadoDto {
  @IsEnum(PagoEstado)
  estado!: PagoEstado;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(191)
  refExterna?: string;
}
