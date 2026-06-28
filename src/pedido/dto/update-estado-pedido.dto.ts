import { IsEnum } from 'class-validator';
import { PedidoEstado } from '@prisma/client';

export class UpdateEstadoPedidoDto {
  @IsEnum(PedidoEstado)
  estado!: PedidoEstado;
}
