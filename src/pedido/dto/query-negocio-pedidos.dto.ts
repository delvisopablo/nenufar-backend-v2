import { Type } from 'class-transformer';
import { PedidoEstado } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryNegocioPedidosDto {
  @IsOptional()
  @IsEnum(PedidoEstado)
  estado?: PedidoEstado;

  @IsOptional()
  @IsString()
  fecha?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
