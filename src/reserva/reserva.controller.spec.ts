import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ReservaController } from './reserva.controller';

describe('ReservaController', () => {
  it('GET /reservas/mis-reservas usa JwtAuthGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ReservaController.prototype.miasAlias,
    ) as unknown[] | undefined;

    expect(guards).toContain(JwtAuthGuard);
  });

  it('GET /me/reservas usa JwtAuthGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      ReservaController.prototype.mias,
    ) as unknown[] | undefined;

    expect(guards).toContain(JwtAuthGuard);
  });
});
