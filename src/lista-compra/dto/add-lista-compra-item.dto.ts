import { Type } from 'class-transformer';
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
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nombreManual?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  cantidad?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  nota?: string;
}
