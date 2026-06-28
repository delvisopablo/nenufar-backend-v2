import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2048)
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  confirmPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  passwordConfirmation?: string;
}
