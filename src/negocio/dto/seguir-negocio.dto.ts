import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

function toOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

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

export class SeguirNegocioDto {
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsOptional()
  @IsBoolean()
  notificaciones?: boolean;
}
