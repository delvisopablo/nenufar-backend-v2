import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches } from 'class-validator';

export class VerifyEmailDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
