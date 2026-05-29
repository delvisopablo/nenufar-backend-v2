import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { me: jest.Mock };

  beforeEach(async () => {
    authService = {
      me: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            me: authService.me,
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /auth/me delega en AuthService para permitir fallback con refresh cookie', async () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AuthController.prototype.me,
    ) as unknown[] | undefined;
    const req = { cookies: {} } as any;
    const res = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

    authService.me.mockResolvedValue({ id: 7 });

    await expect(controller.me(req, res)).resolves.toEqual({ id: 7 });
    expect(guards ?? []).toHaveLength(0);
    expect(authService.me).toHaveBeenCalledWith(req, res);
  });
});
