import { NotificacionTipo } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

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

export class QueryNotificacionesDto {
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsOptional()
  @IsBoolean()
  leida?: boolean;

  @IsOptional()
  @IsEnum(NotificacionTipo)
  tipo?: NotificacionTipo;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
