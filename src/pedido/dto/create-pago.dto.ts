import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { MetodoPago, PagoEstado } from '@prisma/client';

export class CreatePagoDto {
  @IsEnum(MetodoPago)
  metodoPago!: MetodoPago; // TARJETA | BIZUM | EFECTIVO | STRIPE | OTRO

  @IsNumber()
  @Min(0.01)
  cantidad!: number;

  @IsEnum(PagoEstado)
  estado!: PagoEstado; // PENDIENTE | PAGADO | FALLIDO

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(191)
  refExterna?: string;
}
