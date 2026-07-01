import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PedidoEstado } from '@prisma/client';

export class UpdateEstadoPedidoDto {
  @IsEnum(PedidoEstado)
  estado!: PedidoEstado;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
