import { ReservaEstado } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReservaEstadoDto {
  @IsEnum(ReservaEstado)
  estado!: ReservaEstado;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoCancelacion?: string;
}
