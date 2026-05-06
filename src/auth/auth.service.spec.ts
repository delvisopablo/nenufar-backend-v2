/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoCuenta, Prisma, RolGlobal } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { NenufarizarService } from '../nenufarizar/nenufarizar.service';

type TransactionCallback = (tx: unknown) => PromiseLike<unknown>;

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    $transaction: jest.Mock;
    categoria: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    negocio: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    negocioMiembro: {
      create: jest.Mock;
    };
    usuario: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let emailService: {
    isEnabled: jest.Mock;
    sendWelcomeEmail: jest.Mock;
  };
  let nenufarizarService: {
    procesarReferido: jest.Mock;
  };

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ACCESS_TTL = '15m';
    process.env.JWT_REFRESH_TTL = '30d';
    process.env.NODE_ENV = 'test';
    delete process.env.COOKIE_DOMAIN;

    prisma = {
      $transaction: jest.fn(),
      categoria: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      negocio: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      negocioMiembro: {
        create: jest.fn(),
      },
      usuario: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    emailService = {
      isEnabled: jest.fn().mockReturnValue(true),
      sendWelcomeEmail: jest.fn(),
    };
    nenufarizarService = {
      procesarReferido: jest.fn(),
    };

    prisma.$transaction.mockImplementation((callback: TransactionCallback) =>
      Promise.resolve(
        callback({
          $queryRaw: jest.fn(),
          categoria: prisma.categoria,
          negocio: prisma.negocio,
          negocioMiembro: prisma.negocioMiembro,
          usuario: prisma.usuario,
        }),
      ),
    );

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
        {
          provide: EmailService,
          useValue: emailService,
        },
        {
          provide: NenufarizarService,
          useValue: nenufarizarService,
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
    expect(nenufarizarService.procesarReferido).not.toHaveBeenCalled();
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
    ).rejects.toEqual(
      expect.objectContaining({
        message: 'Email o nickname ya en uso',
      }),
    );
  });

  it('register procesa el código de referido si viene informado', async () => {
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
    nenufarizarService.procesarReferido.mockResolvedValue(undefined);

    const res = {
      cookie: jest.fn(),
    } as any;

    await service.register(
      {
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        password: 'secret123',
        codigoReferido: ' nen50 ',
      },
      res,
    );

    expect(nenufarizarService.procesarReferido).toHaveBeenCalledWith(
      7,
      'NEN50',
    );
  });

  it('register no se rompe si el referido falla y solo lo loguea', async () => {
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
    nenufarizarService.procesarReferido.mockRejectedValue(
      new Error('invalid code'),
    );
    const loggerError = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);

    const result = await service.register(
      {
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        password: 'secret123',
        codigoReferido: 'FAIL01',
      },
      { cookie: jest.fn() } as any,
    );

    expect(result).toEqual({
      usuario: expect.objectContaining({
        id: 7,
        nombre: 'Ada',
      }),
    });
    expect(nenufarizarService.procesarReferido).toHaveBeenCalledWith(
      7,
      'FAIL01',
    );
    expect(loggerError).toHaveBeenCalled();
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

  it('registerNegocio crea usuario y negocio, inicia sesion y devuelve access_token', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);
    prisma.categoria.findFirst.mockResolvedValue({
      id: 3,
      nombre: 'Hosteleria',
    });
    prisma.negocio.findUnique.mockResolvedValue(null);
    prisma.usuario.create.mockResolvedValue({
      id: 11,
      nombre: 'Pablo',
      nickname: 'pablo',
      email: 'pablo@example.com',
    });
    prisma.negocio.create.mockResolvedValue({
      id: 25,
      nombre: 'Cafe Nenufar',
      slug: 'cafe-nenufar',
      horario: null,
      nenufarColor: null,
    });
    prisma.negocioMiembro.create.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('business-access-token')
      .mockResolvedValueOnce('business-refresh-token');

    const res = {
      cookie: jest.fn(),
    } as any;

    const result = await service.registerNegocio(
      {
        nombreDueno: 'Pablo',
        nickname: 'pablo',
        email: 'pablo@example.com',
        password: 'secret123',
        nombreNegocio: 'Cafe Nenufar',
        categoriaNombre: 'Hosteleria',
        fechaFundacion: '2024-01-10',
        direccion: 'Calle Mayor 1',
        historia: 'Cafe de especialidad',
      },
      res,
    );

    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ email: 'pablo@example.com' }, { nickname: 'pablo' }],
      },
      select: {
        id: true,
        email: true,
        nickname: true,
      },
    });
    expect(prisma.negocioMiembro.create).toHaveBeenCalledWith({
      data: {
        negocioId: 25,
        usuarioId: 11,
        rol: 'DUENO',
      },
    });
    expect(prisma.negocio.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nombre: 'Cafe Nenufar',
        slug: 'cafe-nenufar',
        duenoId: 11,
      }),
      select: {
        id: true,
        nombre: true,
        slug: true,
        horario: true,
        nenufarColor: true,
      },
    });
    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      access_token: 'business-access-token',
      usuario: {
        id: 11,
        nombre: 'Pablo',
        nickname: 'pablo',
        email: 'pablo@example.com',
        rol: 'negocio',
        negocio: {
          id: 25,
          nombre: 'Cafe Nenufar',
          slug: 'cafe-nenufar',
          horario: null,
          nenufarColor: null,
        },
      },
    });
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
      select: expect.objectContaining({
        id: true,
        nombre: true,
        nickname: true,
        email: true,
        password: true,
        foto: true,
        biografia: true,
        negocios: expect.any(Object),
      }),
    });

    await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login envía el welcome email una sola vez y lo marca al enviarse bien', async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        password: await bcrypt.hash('secret123', 10),
        foto: 'ada.png',
        biografia: 'Bio de Ada',
        creadoEn: new Date('2026-01-01T00:00:00.000Z'),
        actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
        emailVerificado: true,
        estadoCuenta: EstadoCuenta.ACTIVA,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 3,
        negocios: [],
      })
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        email: 'ada@example.com',
        nickname: 'ada',
        foto: 'ada.png',
        biografia: 'Bio actualizada',
        creadoEn: new Date('2026-01-01T00:00:00.000Z'),
        actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
        emailVerificado: false,
        estadoCuenta: EstadoCuenta.ACTIVA,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 0,
        negocios: [],
        welcomeEmailSentAt: null,
      })
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        foto: 'ada.png',
        biografia: 'Bio de Ada',
        creadoEn: new Date('2026-01-01T00:00:00.000Z'),
        actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
        emailVerificado: true,
        estadoCuenta: EstadoCuenta.ACTIVA,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 3,
        negocios: [],
      });
    prisma.usuario.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const res = {
      cookie: jest.fn(),
    } as any;

    const result = await service.login(
      {
        email: 'ada@example.com',
        password: 'secret123',
      },
      res,
    );

    expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
      'ada@example.com',
      'Ada',
    );
    expect(prisma.usuario.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 7 },
        data: { ultimoLoginEn: expect.any(Date) },
      }),
    );
    expect(prisma.usuario.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 7 },
        data: { welcomeEmailSentAt: expect.any(Date) },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        biografia: 'Bio de Ada',
        foto: 'ada.png',
        foto_perfil: 'ada.png',
        rol: 'usuario',
      }),
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      1,
      'access_token',
      'access-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60 * 1000,
      }),
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      2,
      'refresh_token',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      }),
    );
  });

  it('login no reenvía el welcome email si ya fue enviado', async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        password: await bcrypt.hash('secret123', 10),
        foto: null,
        biografia: null,
        creadoEn: new Date('2026-01-01T00:00:00.000Z'),
        actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
        emailVerificado: false,
        estadoCuenta: EstadoCuenta.ACTIVA,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 0,
        negocios: [],
      })
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        email: 'ada@example.com',
        welcomeEmailSentAt: new Date('2026-04-01T10:00:00.000Z'),
      });
    prisma.usuario.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    await service.login(
      {
        email: 'ada@example.com',
        password: 'secret123',
      },
      { cookie: jest.fn() } as any,
    );

    expect(emailService.sendWelcomeEmail).not.toHaveBeenCalled();
    expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
  });

  it('login no se rompe si falla el envío del welcome email y no marca el campo', async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        password: await bcrypt.hash('secret123', 10),
        foto: null,
        biografia: 'Bio actualizada',
        creadoEn: new Date('2026-01-01T00:00:00.000Z'),
        actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
        emailVerificado: false,
        estadoCuenta: EstadoCuenta.ACTIVA,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 0,
        negocios: [],
      })
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        email: 'ada@example.com',
        welcomeEmailSentAt: null,
      })
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        foto: null,
        biografia: 'Bio actualizada',
        creadoEn: new Date('2026-01-01T00:00:00.000Z'),
        actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
        emailVerificado: false,
        estadoCuenta: EstadoCuenta.ACTIVA,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 0,
        negocios: [],
      });
    prisma.usuario.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    emailService.sendWelcomeEmail.mockRejectedValue(new Error('resend failed'));

    const result = await service.login(
      {
        email: 'ada@example.com',
        password: 'secret123',
      },
      { cookie: jest.fn() } as any,
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        foto: null,
        foto_perfil: null,
        biografia: 'Bio actualizada',
        rol: 'usuario',
      }),
    );
    expect(emailService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { ultimoLoginEn: expect.any(Date) },
      }),
    );
  });

  it('login sigue funcionando en local cuando RESEND_ENABLED esta desactivado', async () => {
    emailService.isEnabled.mockReturnValue(false);
    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        password: await bcrypt.hash('secret123', 10),
        foto: null,
        biografia: 'Bio local',
        creadoEn: new Date('2026-01-01T00:00:00.000Z'),
        actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
        emailVerificado: true,
        estadoCuenta: EstadoCuenta.ACTIVA,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 4,
        negocios: [],
      })
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        foto: null,
        biografia: 'Bio local',
        creadoEn: new Date('2026-01-01T00:00:00.000Z'),
        actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
        emailVerificado: true,
        estadoCuenta: EstadoCuenta.ACTIVA,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 4,
        negocios: [],
      });
    prisma.usuario.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login(
      {
        email: 'ada@example.com',
        password: 'secret123',
      },
      { cookie: jest.fn() } as any,
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        rol: 'usuario',
      }),
    );
    expect(emailService.sendWelcomeEmail).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { ultimoLoginEn: expect.any(Date) },
      }),
    );
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
        biografia: 'Hola',
        rolGlobal: RolGlobal.USUARIO,
        rol: 'negocio',
        foto: 'avatar.png',
        foto_perfil: 'avatar.png',
        negocio: expect.objectContaining({ id: 3, nombre: 'Cafe Demo' }),
      }),
    );
  });

  it('refresh valida el refresh_token desde cookies y rota ambas cookies', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 12,
      email: 'ada@example.com',
      nickname: 'ada',
    });
    jwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    const res = {
      cookie: jest.fn(),
    } as any;

    const result = await service.refresh(
      {
        cookies: {
          refresh_token: 'incoming-refresh-token',
        },
        headers: {},
      } as any,
      res,
    );

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'incoming-refresh-token',
      { secret: 'test-refresh-secret' },
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      1,
      'access_token',
      'new-access-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      2,
      'refresh_token',
      'new-refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      }),
    );
    expect(result).toEqual({ ok: true });
  });

  it('logout limpia cookies con las mismas opciones cross-site de producción', () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_DOMAIN = '.minenufar.com';

    const res = {
      clearCookie: jest.fn(),
    } as any;

    const result = service.logout(res);

    expect(res.clearCookie).toHaveBeenNthCalledWith(
      1,
      'access_token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        domain: '.minenufar.com',
      }),
    );
    expect(res.clearCookie).toHaveBeenNthCalledWith(
      2,
      'refresh_token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        domain: '.minenufar.com',
      }),
    );
    expect(result).toEqual({ ok: true });
  });

  it('me verifica access_token desde cookies si el middleware no pobló req.user', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 9,
      email: 'demo@example.com',
      nickname: 'demo',
    });
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
      cookies: {
        access_token: 'incoming-access-token',
      },
      headers: {},
    } as any);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'incoming-access-token',
      { secret: 'test-access-secret' },
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 9,
        email: 'demo@example.com',
        biografia: 'Hola',
        foto_perfil: 'avatar.png',
      }),
    );
  });
});
