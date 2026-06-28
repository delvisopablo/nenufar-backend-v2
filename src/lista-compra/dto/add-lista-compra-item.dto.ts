import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class AddListaCompraItemDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  productoId?: number;

  @ValidateIf(
    (dto: AddListaCompraItemDto) =>
      dto.productoId === undefined || dto.productoId === null,
  )
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombreManual?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  cantidad?: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  @MaxLength(500)
  nota?: string;
}
