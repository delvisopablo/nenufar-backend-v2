import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  motivo?: string;
}
