import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CanalVenta, PedidoEstado } from '@prisma/client';

export class UpdatePedidoDto {
  @IsEnum(PedidoEstado)
  @IsOptional()
  estado?: PedidoEstado; // PENDIENTE | COMPLETADO | ENTREGADO | CANCELADO

  @IsEnum(CanalVenta)
  @IsOptional()
  canalVenta?: CanalVenta;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
