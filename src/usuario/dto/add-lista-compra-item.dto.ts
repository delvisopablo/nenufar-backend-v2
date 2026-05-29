import { IsInt, IsPositive, IsOptional, IsString, Min } from 'class-validator';

export class AddListaCompraItemDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  productoId?: number;

  @IsOptional()
  @IsString()
  nombreManual?: string;

  @IsInt()
  @Min(1)
  cantidad: number = 1;

  @IsOptional()
  @IsString()
  nota?: string;

  constructor(partial?: Partial<AddListaCompraItemDto>) {
    Object.assign(this, partial);
  }
}
