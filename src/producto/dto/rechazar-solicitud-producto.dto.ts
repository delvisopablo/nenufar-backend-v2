import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RechazarSolicitudProductoDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoRechazo?: string;
}
