import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, Min } from 'class-validator';

export class ConfigHorarioDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  intervaloReserva?: number; // minutos

  @IsOptional()
  @IsObject()
  horario?: any; // mantenemos libre; si quieres, luego validamos el shape

  @IsOptional()
  @IsBoolean()
  reservasActivas?: boolean;
}

// (opcional) ejemplo de shape esperado:
// {
//   "weekly": {
//     "mon": [["09:00","13:00"],["16:00","20:00"]],
//     "tue": [["09:00","13:00"],["16:00","20:00"]],
//     "wed": [["09:00","13:00"],["16:00","20:00"]],
//     "thu": [["09:00","13:00"],["16:00","20:00"]],
//     "fri": [["09:00","13:00"],["16:00","21:00"]],
//     "sat": [["10:00","14:00"]],
//     "sun": []
//   },
//   "exceptions": {
//     "2025-12-25": [],
//     "2025-12-24": [["10:00","14:00"],["17:00","19:00"]]
//   }
// }
