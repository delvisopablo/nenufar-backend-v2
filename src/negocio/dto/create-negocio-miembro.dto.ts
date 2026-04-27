import { RolNegocio } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class CreateNegocioMiembroDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usuarioId!: number;

  @IsOptional()
  @IsEnum(RolNegocio)
  rol?: RolNegocio;
}
