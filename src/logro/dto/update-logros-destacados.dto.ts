import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsInt, Min } from 'class-validator';

export class UpdateLogrosDestacadosDto {
  @IsArray()
  @ArrayMaxSize(3)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  logroIds: number[];
}
