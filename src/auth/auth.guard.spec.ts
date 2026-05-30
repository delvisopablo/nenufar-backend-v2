import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

function buildContext(request: unknown) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('AuthGuard', () => {
  let jwtService: { verifyAsync: jest.Mock };
  let prisma: {
    usuario: {
      findUnique: jest.Mock;
    };
  };
  let guard: AuthGuard;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    prisma = {
      usuario: {
        findUnique: jest.fn(),
      },
    };
    guard = new AuthGuard(jwtService as any, prisma as any);
  });

  it('respeta req.user ya autenticado por el middleware de cookies', async () => {
    const request = {
      user: {
        id: 22,
        email: 'demo@example.com',
      },
      cookies: {},
      headers: {},
    };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);

    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    expect(request).toEqual(
      expect.objectContaining({
        usuario: {
          id: 22,
          email: 'demo@example.com',
        },
      }),
    );
  });

  it('devuelve 401 claro si no hay cookie ni bearer', async () => {
    await expect(
      guard.canActivate(buildContext({ cookies: {}, headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
