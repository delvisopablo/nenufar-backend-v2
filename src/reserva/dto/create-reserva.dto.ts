import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateReservaDto {
  @IsDateString()
  fecha!: string; // ISO (start). Debe caer en un slot disponible generado

  @IsString()
  @IsOptional()
  @MaxLength(500)
  nota?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  recursoId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duracionMinutos?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  numPersonas?: number;
}
