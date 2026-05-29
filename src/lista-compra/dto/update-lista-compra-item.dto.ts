import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateListaCompraItemDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  cantidad?: number;

  @IsBoolean()
  @IsOptional()
  completado?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  nota?: string | null;
}
