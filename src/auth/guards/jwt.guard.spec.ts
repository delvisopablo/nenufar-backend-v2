import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt.guard';

function buildContext(request: unknown) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('no exige Passport si req.user ya viene autenticado por cookie', () => {
    const guard = new JwtAuthGuard();

    expect(
      guard.canActivate(
        buildContext({
          user: { id: 22 },
          cookies: {},
          headers: {},
        }),
      ),
    ).toBe(true);
  });
});
