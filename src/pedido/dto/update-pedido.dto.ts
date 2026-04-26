import { IsEnum, IsOptional } from 'class-validator';
import { CanalVenta, PedidoEstado } from '@prisma/client';

export class UpdatePedidoDto {
  @IsEnum(PedidoEstado)
  @IsOptional()
  estado?: PedidoEstado; // PENDIENTE | COMPLETADO | CANCELADO

  @IsEnum(CanalVenta)
  @IsOptional()
  canalVenta?: CanalVenta;
}
