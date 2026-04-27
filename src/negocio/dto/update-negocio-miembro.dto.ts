import { RolNegocio } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateNegocioMiembroDto {
  @IsEnum(RolNegocio)
  rol!: RolNegocio;
}
