import { IsInt, IsPositive } from 'class-validator';

export class AddProductoFavoritoDto {
  @IsInt()
  @IsPositive()
  productoId: number;
}
