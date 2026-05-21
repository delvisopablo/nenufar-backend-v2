import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function normalizeCode(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class RegisterNegocioDto {
  @ApiProperty({
    example: 'Pablo Delviso',
    description: 'Nombre del dueño.',
  })
  @Transform(({ value }) => trimString(value))
  @ValidateIf(
    (o: RegisterNegocioDto) =>
      o.nombreDueno === undefined && o['nombreDueño'] === undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre?: string;

  @ApiPropertyOptional({
    example: 'Pablo Delviso',
    description: 'Alias legacy de "nombre".',
  })
  @Transform(({ value }) => trimString(value))
  @ValidateIf((o: RegisterNegocioDto) => o.nombre === undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombreDueno?: string;

  @Transform(({ value }) => trimString(value))
  @ValidateIf(
    (o: RegisterNegocioDto) =>
      o.nombre === undefined && o.nombreDueno === undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  readonly ['nombreDueño']?: string;

  @ApiProperty({ example: 'pablodelviso' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  nickname!: string;

  @ApiProperty({ example: 'pablo@minenufar.com' })
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Nenufar123!' })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Cafeteria Nenufar' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombreNegocio!: string;

  @ApiPropertyOptional({
    example: 'cafeteria-nenufar',
    description: 'Slug público del negocio.',
  })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @ApiPropertyOptional({
    example: 'cafeteria-nenufar',
    description: 'Alias de "slug" usado por frontend.',
  })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nicknameNegocio?: string;

  @ApiProperty({ example: 1, description: 'ID de la categoría del negocio' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoriaId!: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'ID de subcategoría (debe pertenecer a categoriaId)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  subcategoriaId?: number;

  @ApiPropertyOptional({ example: '2020-06-01' })
  @IsOptional()
  @IsDateString()
  fechaFundacion?: string;

  @ApiPropertyOptional({ example: 'Calle Mayor 14' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @ApiPropertyOptional({
    example: 'Un rincon tranquilo con cafes especiales.',
    description: 'Historia o descripción larga del negocio.',
  })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  historia?: string;

  @ApiPropertyOptional({
    example: 'Un rincon tranquilo con cafes especiales.',
    description: 'Alias de "historia" usado por frontend.',
  })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @ApiPropertyOptional({
    example: 'Un rincon tranquilo con cafes especiales.',
    description: 'Alias adicional de "historia".',
  })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  biografia?: string;

  @ApiPropertyOptional({
    example: 'nenufar-rosa-01',
    description: 'Identificador del nenúfar elegido.',
  })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nenufarActivo?: string;

  @ApiPropertyOptional({
    example: 'nenufar-rosa-01',
    description: 'Alias legacy de "nenufarActivo".',
  })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nenufarAsset?: string;

  @ApiPropertyOptional({
    example: 'NENU-PABLO-8F3K',
    description:
      'Código de nenufarización (opcional o requerido según configuración)',
  })
  @Transform(({ value }) => normalizeCode(value))
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoNenufarizacion?: string;

  @ApiPropertyOptional({
    example: 'Pastelería artesanal con dulces de temporada',
    description: 'Descripción corta del negocio (máx. 160 caracteres).',
  })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  descripcionCorta?: string;

  @ApiPropertyOptional({
    description: 'Horario semanal en formato JSON estructurado.',
  })
  @IsOptional()
  @IsObject()
  horario?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    example: 30,
    description: 'Intervalo de reserva en minutos.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  intervaloReserva?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el negocio acepta reservas.',
  })
  @IsOptional()
  @IsBoolean()
  reservasActivas?: boolean;
}
