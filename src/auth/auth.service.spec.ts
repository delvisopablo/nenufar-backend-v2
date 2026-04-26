import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoCuenta, Prisma, RolGlobal } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    usuario: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ACCESS_TTL = '15m';
    process.env.JWT_REFRESH_TTL = '30d';

    prisma = {
      usuario: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('register crea usuario, emite cookies y devuelve usuario público compatible', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);
    prisma.usuario.create.mockResolvedValue({
      id: 7,
      nombre: 'Ada',
      nickname: 'ada',
      email: 'ada@example.com',
    });
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const res = {
      cookie: jest.fn(),
    } as any;

    const result = await service.register(
      {
        nombre: ' Ada ',
        nickname: ' ada ',
        email: ' ADA@EXAMPLE.COM ',
        password: 'secret123',
        biografia: ' Bio ',
      },
      res,
    );

    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ email: 'ada@example.com' }, { nickname: 'ada' }],
      },
      select: {
        id: true,
        email: true,
        nickname: true,
      },
    });
    expect(prisma.usuario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nombre: 'Ada',
          nickname: 'ada',
          email: 'ada@example.com',
          biografia: 'Bio',
        }),
      }),
    );
    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      usuario: expect.objectContaining({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
      }),
    });
  });

  it('register traduce P2002 a 409', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);
    prisma.usuario.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );

    await expect(
      service.register(
        {
          nombre: 'Ada',
          nickname: 'ada',
          email: 'ada@example.com',
          password: 'secret123',
        },
        { cookie: jest.fn() } as any,
      ),
    ).rejects.toEqual(expect.objectContaining({
      message: 'Email o nickname ya en uso',
    }));
  });

  it('register devuelve 409 cuando email o nickname ya existen', async () => {
    prisma.usuario.findFirst.mockResolvedValue({
      email: 'ada@example.com',
      nickname: 'ada',
    });

    await expect(
      service.register(
        {
          nombre: 'Ada',
          nickname: 'ada',
          email: 'ada@example.com',
          password: 'secret123',
        },
        { cookie: jest.fn() } as any,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login devuelve 401 si la contraseña no coincide', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 7,
      nombre: 'Ada',
      nickname: 'ada',
      email: 'ada@example.com',
      password: await bcrypt.hash('otra-clave', 10),
      foto: null,
      biografia: null,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
      emailVerificado: false,
      estadoCuenta: EstadoCuenta.ACTIVA,
      rolGlobal: RolGlobal.USUARIO,
      petalosSaldo: 0,
      negocios: [],
    });

    const promise = service.login(
      {
        email: 'ada@example.com',
        password: 'wrong-pass',
      },
      { cookie: jest.fn() } as any,
    );

    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: 'ada@example.com' },
      select: {
        id: true,
        nombre: true,
        nickname: true,
        email: true,
        password: true,
      },
    });

    await expect(
      promise,
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('me usa req.user.id del middleware y devuelve alias compatibles', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 9,
      nombre: 'Negocio Demo',
      nickname: 'demo',
      email: 'demo@example.com',
      foto: 'avatar.png',
      biografia: 'Hola',
      creadoEn: new Date('2026-01-01T00:00:00.000Z'),
      actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
      emailVerificado: true,
      estadoCuenta: EstadoCuenta.ACTIVA,
      rolGlobal: RolGlobal.USUARIO,
      petalosSaldo: 8,
      negocios: [{ id: 3, nombre: 'Cafe Demo' }],
    });

    const result = await service.me({
      user: {
        id: 9,
        email: 'demo@example.com',
        nickname: 'demo',
      },
    } as any);

    expect(result).toEqual(
      expect.objectContaining({
        id: 9,
        rolGlobal: RolGlobal.USUARIO,
        rol: 'negocio',
        foto: 'avatar.png',
        foto_perfil: 'avatar.png',
        negocio: { id: 3, nombre: 'Cafe Demo' },
      }),
    );
  });
});
