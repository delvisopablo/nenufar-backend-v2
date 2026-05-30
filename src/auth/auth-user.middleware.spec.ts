import { EstadoCuenta, RolGlobal } from '@prisma/client';
import { AuthUserMiddleware } from './auth-user.middleware';

describe('AuthUserMiddleware', () => {
  const originalEnv = process.env;
  let jwtService: { verifyAsync: jest.Mock };
  let prisma: {
    usuario: {
      findUnique: jest.Mock;
    };
  };
  let middleware: AuthUserMiddleware;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JWT_ACCESS_SECRET: 'access-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
    };
    jwtService = { verifyAsync: jest.fn() };
    prisma = {
      usuario: {
        findUnique: jest.fn(),
      },
    };
    middleware = new AuthUserMiddleware(jwtService as any, prisma as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rellena req.user desde refresh_token si el access_token caducó', async () => {
    jwtService.verifyAsync
      .mockRejectedValueOnce(new Error('jwt expired'))
      .mockResolvedValueOnce({
        sub: 22,
        email: 'demo@example.com',
        nickname: 'demo',
        rolGlobal: RolGlobal.USUARIO,
      });
    prisma.usuario.findUnique.mockResolvedValue({
      id: 22,
      email: 'demo@example.com',
      nickname: 'demo',
      rolGlobal: RolGlobal.USUARIO,
      estadoCuenta: EstadoCuenta.ACTIVA,
      eliminadoEn: null,
    });
    const req = {
      cookies: {
        access_token: 'expired-access-token',
        refresh_token: 'valid-refresh-token',
      },
      headers: {},
    } as any;
    const next = jest.fn();

    await middleware.use(req, {} as any, next);

    expect(jwtService.verifyAsync).toHaveBeenNthCalledWith(
      1,
      'expired-access-token',
      { secret: 'access-secret' },
    );
    expect(jwtService.verifyAsync).toHaveBeenNthCalledWith(
      2,
      'valid-refresh-token',
      { secret: 'refresh-secret' },
    );
    expect(req.user).toEqual(
      expect.objectContaining({
        id: 22,
        nickname: 'demo',
        isAdmin: false,
      }),
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
