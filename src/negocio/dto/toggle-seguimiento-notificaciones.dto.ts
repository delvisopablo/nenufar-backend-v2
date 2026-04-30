import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return value;
}

export class ToggleSeguimientoNotificacionesDto {
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  activas: boolean;
}
