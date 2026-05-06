import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateReservaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  negocioId?: number;

  @IsDateString()
  fecha!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  nota?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  recursoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duracionMinutos?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numPersonas?: number;
}
