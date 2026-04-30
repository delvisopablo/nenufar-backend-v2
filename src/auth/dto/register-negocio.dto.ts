import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterNegocioDto {
  @ApiProperty({ example: 'Pablo Delviso' })
  @Transform(({ value, obj }) =>
    typeof value === 'string'
      ? value.trim()
      : typeof obj?.['nombreDueño'] === 'string'
        ? obj['nombreDueño'].trim()
        : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombreDueno!: string;

  @ApiProperty({ example: 'pablodelviso' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  nickname!: string;

  @ApiProperty({ example: 'pablo@minenufar.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Nenufar123!' })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Cafeteria Nenufar' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombreNegocio!: string;

  @ApiPropertyOptional({ example: 'cafeteria-nenufar' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @ApiProperty({ example: 'Hosteleria' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  categoriaNombre!: string;

  @ApiProperty({ example: '2020-06-01' })
  @IsDateString()
  fechaFundacion!: string;

  @ApiPropertyOptional({ example: 'Calle Mayor 14' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @ApiPropertyOptional({ example: 'Un rincon tranquilo con cafes especiales.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  historia?: string;
}
