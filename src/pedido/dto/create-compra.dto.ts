import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';

// si en el futuro quieres permitir split de compra entre varios usuarios,
// podríamos aceptar un array; ahora es simple: 1 compra = 1 usuario
export class CreateCompraDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;
}
