import { IsInt, IsBoolean, IsOptional, IsString, Min } from 'class-validator';

export class UpdateListaCompraItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @IsBoolean()
  completado?: boolean;

  @IsOptional()
  @IsString()
  nota?: string;
}
