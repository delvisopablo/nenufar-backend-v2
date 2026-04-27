import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProductoStockDto {
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  deltaDisponible?: number;

  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  deltaReservado?: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivo?: string;
}
