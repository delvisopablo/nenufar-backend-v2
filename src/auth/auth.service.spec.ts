/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import { Logger, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoCuenta, Prisma, RolGlobal } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { AuthEmailWebhookService } from '../email/auth-email-webhook.service';
import { NenufarizarService } from '../nenufarizar/nenufarizar.service';

type TransactionCallback = (tx: unknown) => PromiseLike<unknown>;
type AuthServiceSpecHarness = {
  generateEmailVerificationCode: () => string;
  hashEmailVerificationCode: (code: string) => string;
  logger: Pick<Logger, 'error' | 'warn'>;
};

function specHarness(service: AuthService) {
  return service as unknown as AuthServiceSpecHarness;
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    $transaction: jest.Mock;
    categoria: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    subcategoria: {
      findFirst: jest.Mock;
    };
    codigoNenufarizacion: {
      findUnique: jest.Mock;
      update: jest.Mock;
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
      updateMany: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let authEmailWebhookService: {
    isEnabled: jest.Mock;
    sendWelcomeEmail: jest.Mock;
    sendBusinessWelcomeEmail: jest.Mock;
    sendConfirmationCode: jest.Mock;
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
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      subcategoria: {
        findFirst: jest.fn(),
      },
      codigoNenufarizacion: {
        findUnique: jest.fn(),
        update: jest.fn(),
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
        updateMany: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    authEmailWebhookService = {
      isEnabled: jest.fn().mockReturnValue(false),
      sendWelcomeEmail: jest.fn(),
      sendBusinessWelcomeEmail: jest.fn(),
      sendConfirmationCode: jest.fn(),
    };
    nenufarizarService = {
      procesarReferido: jest.fn(),
    };

    prisma.$transaction.mockImplementation((callback: TransactionCallback) =>
      Promise.resolve(
        callback({
          categoria: prisma.categoria,
          subcategoria: prisma.subcategoria,
          codigoNenufarizacion: prisma.codigoNenufarizacion,
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
          provide: AuthEmailWebhookService,
          useValue: authEmailWebhookService,
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

  it('register crea usuario y requiere verificación de email', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);
    prisma.usuario.create.mockResolvedValue({
      id: 7,
      nombre: 'Ada',
      nickname: 'ada',
      email: 'ada@example.com',
      rolGlobal: RolGlobal.USUARIO,
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
        emailVerificado: true,
        codigoVerificacionEmailHash: true,
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
    expect(res.cookie).not.toHaveBeenCalled();
    expect(nenufarizarService.procesarReferido).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        requiresEmailVerification: true,
      }),
    );
  });

  it('register genera y envía código de confirmación después de crear el usuario', async () => {
    authEmailWebhookService.sendConfirmationCode.mockResolvedValue(true);
    prisma.usuario.findFirst.mockResolvedValue(null);
    prisma.usuario.create.mockResolvedValue({
      id: 7,
      nombre: 'Ada',
      nickname: 'ada',
      email: 'ada@example.com',
      rolGlobal: RolGlobal.USUARIO,
    });
    prisma.usuario.findUnique.mockResolvedValueOnce(null);
    prisma.usuario.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.register(
      {
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        password: 'secret123',
      },
      { cookie: jest.fn() } as any,
    );

    expect(authEmailWebhookService.sendConfirmationCode).toHaveBeenCalledWith(
      'ada@example.com',
      'Ada',
      expect.stringMatching(/^\d{6}$/),
    );
    expect(prisma.usuario.create.mock.invocationCallOrder[0]).toBeLessThan(
      authEmailWebhookService.sendConfirmationCode.mock.invocationCallOrder[0],
    );
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({
        codigoVerificacionEmailHash: expect.any(String),
        codigoVerificacionEmailExpiraEn: expect.any(Date),
        codigoVerificacionEmailIntentos: 0,
        codigoVerificacionEmailUltimoEnvioEn: expect.any(Date),
      }),
    });
    expect(result).toEqual({
      ok: true,
      requiresEmailVerification: true,
      emailVerification: {
        email: 'ad***@example.com',
        expiresInMinutes: 5,
      },
    });
  });

  it('register genera un código nuevo para cada usuario registrado', async () => {
    const generateSpy = jest
      .spyOn(specHarness(service), 'generateEmailVerificationCode')
      .mockReturnValueOnce('222222')
      .mockReturnValueOnce('333333');
    authEmailWebhookService.sendConfirmationCode.mockResolvedValue(true);
    prisma.usuario.findFirst.mockResolvedValue(null);
    prisma.usuario.create
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        rolGlobal: RolGlobal.USUARIO,
      })
      .mockResolvedValueOnce({
        id: 8,
        nombre: 'Grace',
        nickname: 'grace',
        email: 'grace@example.com',
        rolGlobal: RolGlobal.USUARIO,
      });
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.usuario.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('access-token-1')
      .mockResolvedValueOnce('refresh-token-1')
      .mockResolvedValueOnce('access-token-2')
      .mockResolvedValueOnce('refresh-token-2');

    await service.register(
      {
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        password: 'secret123',
      },
      { cookie: jest.fn() } as any,
    );
    await service.register(
      {
        nombre: 'Grace',
        nickname: 'grace',
        email: 'grace@example.com',
        password: 'secret123',
      },
      { cookie: jest.fn() } as any,
    );

    expect(
      authEmailWebhookService.sendConfirmationCode,
    ).toHaveBeenNthCalledWith(1, 'ada@example.com', 'Ada', '222222');
    expect(
      authEmailWebhookService.sendConfirmationCode,
    ).toHaveBeenNthCalledWith(2, 'grace@example.com', 'Grace', '333333');
    expect(
      authEmailWebhookService.sendConfirmationCode.mock.calls[0][2],
    ).not.toBe(authEmailWebhookService.sendConfirmationCode.mock.calls[1][2]);

    generateSpy.mockRestore();
  });

  it('register no se rompe si falla el webhook de código de confirmación', async () => {
    authEmailWebhookService.sendConfirmationCode.mockRejectedValue(
      new Error('n8n failed'),
    );
    const loggerError = jest
      .spyOn(specHarness(service).logger, 'error')
      .mockImplementation(() => undefined);
    prisma.usuario.findFirst.mockResolvedValue(null);
    prisma.usuario.create.mockResolvedValue({
      id: 7,
      nombre: 'Ada',
      nickname: 'ada',
      email: 'ada@example.com',
      rolGlobal: RolGlobal.USUARIO,
    });
    prisma.usuario.findUnique.mockResolvedValueOnce(null);
    prisma.usuario.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.register(
      {
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        password: 'secret123',
      },
      { cookie: jest.fn() } as any,
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        requiresEmailVerification: true,
      }),
    );
    expect(authEmailWebhookService.sendConfirmationCode).toHaveBeenCalledTimes(
      1,
    );
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({
        codigoVerificacionEmailHash: expect.any(String),
      }),
    });
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('Fallo enviando código de verificación'),
      expect.any(String),
    );
    loggerError.mockRestore();
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
        code: 'EMAIL_ALREADY_IN_USE',
        message: 'Este correo ya está en uso.',
        details: expect.objectContaining({
          fieldErrors: { email: 'Este correo ya está en uso.' },
        }),
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
      rolGlobal: RolGlobal.USUARIO,
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
      rolGlobal: RolGlobal.USUARIO,
    });
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    nenufarizarService.procesarReferido.mockRejectedValue(
      new Error('invalid code'),
    );
    const loggerError = jest
      .spyOn(specHarness(service).logger, 'error')
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

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        requiresEmailVerification: true,
      }),
    );
    expect(nenufarizarService.procesarReferido).toHaveBeenCalledWith(
      7,
      'FAIL01',
    );
    expect(loggerError).toHaveBeenCalled();
  });

  it('register devuelve 409 cuando email o nickname ya existen', async () => {
    prisma.usuario.findFirst.mockResolvedValue({
      id: 7,
      email: 'ada@example.com',
      nickname: 'ada',
      emailVerificado: true,
      codigoVerificacionEmailHash: null,
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
    ).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_IN_USE',
      message: 'Este correo ya está en uso.',
    });
  });

  it('registerNegocio crea usuario y negocio, inicia sesion y devuelve access_token', async () => {
    // email check (findUnique): no existe → null; luego getPublicAuthUserById → null (fallback)
    prisma.usuario.findUnique.mockResolvedValue(null);
    // nickname check (findFirst): no existe → null
    prisma.usuario.findFirst.mockResolvedValue(null);
    // categoria existe por ID
    prisma.categoria.findUnique.mockResolvedValue({ id: 3 });
    // slug generado: negocio.findUnique → null (slug libre)
    prisma.negocio.findUnique.mockResolvedValue(null);
    prisma.usuario.create.mockResolvedValue({
      id: 11,
      nombre: 'Pablo',
      nickname: 'pablo',
      email: 'pablo@example.com',
      rolGlobal: RolGlobal.USUARIO,
    });
    prisma.negocio.create.mockResolvedValue({
      id: 25,
      nombre: 'Cafe Nenufar',
      slug: 'cafe-nenufar',
      horario: null,
      intervaloReserva: null,
      reservasActivas: false,
      nenufarColor: null,
      nenufarActivo: 'nenufar-loto-rosa',
      nenufarAsset: 'nenufar-loto-rosa',
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
        categoriaId: 3,
        fechaFundacion: '2024-01-10',
        direccion: 'Calle Mayor 1',
        historia: 'Cafe de especialidad',
        nenufarActivo: 'nenufar-loto-rosa',
        codigoNenufarizacion: '   ',
      },
      res,
    );

    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { email: 'pablo@example.com' },
      select: { id: true },
    });
    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: { nickname: { equals: 'pablo', mode: 'insensitive' } },
      select: { id: true },
    });
    expect(prisma.categoria.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
      select: { id: true },
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
        categoriaId: 3,
        nenufarActivo: 'nenufar-loto-rosa',
        nenufarAsset: 'nenufar-loto-rosa',
      }),
      select: {
        id: true,
        nombre: true,
        slug: true,
        horario: true,
        intervaloReserva: true,
        reservasActivas: true,
        nenufarColor: true,
        nenufarActivo: true,
        nenufarAsset: true,
      },
    });
    expect(prisma.codigoNenufarizacion.findUnique).not.toHaveBeenCalled();
    expect(prisma.codigoNenufarizacion.update).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      requiresEmailVerification: true,
      emailVerification: {
        email: 'pa***@example.com',
        expiresInMinutes: 5,
      },
    });
    expect(authEmailWebhookService.sendConfirmationCode).toHaveBeenCalledWith(
      'pablo@example.com',
      'Pablo',
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it('registerNegocio normaliza y guarda horario, intervalo y reservas activas', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.usuario.findFirst.mockResolvedValue(null);
    prisma.categoria.findUnique.mockResolvedValue({ id: 3 });
    prisma.negocio.findUnique.mockResolvedValue(null);
    prisma.usuario.create.mockResolvedValue({
      id: 11,
      nombre: 'Pablo',
      nickname: 'pablo',
      email: 'pablo@example.com',
      rolGlobal: RolGlobal.USUARIO,
    });
    prisma.negocio.create.mockResolvedValue({
      id: 25,
      nombre: 'Cafe Nenufar',
      slug: 'cafe-nenufar',
      horario: {
        weekly: {
          mon: [['10:00', '20:00']],
          tue: [['10:00', '20:00']],
          wed: [],
          thu: [],
          fri: [],
          sat: [['10:00', '14:00']],
          sun: [],
        },
      },
      intervaloReserva: 30,
      reservasActivas: true,
      nenufarColor: null,
      nenufarActivo: null,
      nenufarAsset: null,
    });
    prisma.negocioMiembro.create.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('business-access-token')
      .mockResolvedValueOnce('business-refresh-token');

    await service.registerNegocio(
      {
        nombreDueno: 'Pablo',
        nickname: 'pablo',
        email: 'pablo@example.com',
        password: 'secret123',
        nombreNegocio: 'Cafe Nenufar',
        categoriaId: 3,
        horario: {
          lunes: { abierto: true, apertura: '10:00', cierre: '20:00' },
          martes: { abierto: true, apertura: '10:00', cierre: '20:00' },
          sabado: { abierto: true, apertura: '10:00', cierre: '14:00' },
          domingo: { abierto: false },
        },
        intervaloReserva: 30,
        reservasActivas: true,
      },
      { cookie: jest.fn() } as any,
    );

    expect(prisma.negocio.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        horario: {
          weekly: {
            mon: [['10:00', '20:00']],
            tue: [['10:00', '20:00']],
            wed: [],
            thu: [],
            fri: [],
            sat: [['10:00', '14:00']],
            sun: [],
          },
        },
        intervaloReserva: 30,
        reservasActivas: true,
      }),
      select: expect.any(Object),
    });
  });

  it('registerNegocio rechaza reservas activas sin dias abiertos', async () => {
    await expect(
      service.registerNegocio(
        {
          nombreDueno: 'Pablo',
          nickname: 'pablo',
          email: 'pablo@example.com',
          password: 'secret123',
          nombreNegocio: 'Cafe Nenufar',
          categoriaId: 3,
          horario: {
            domingo: { abierto: false },
          },
          intervaloReserva: 30,
          reservasActivas: true,
        },
        { cookie: jest.fn() } as any,
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_SCHEDULE',
      message:
        'Si las reservas estan activas, debe haber al menos un dia abierto',
    });

    expect(prisma.negocio.create).not.toHaveBeenCalled();
  });

  it('registerNegocio devuelve error claro cuando el código de nenufarización es inválido', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.usuario.findFirst.mockResolvedValue(null);
    prisma.categoria.findUnique.mockResolvedValue({ id: 3 });
    prisma.codigoNenufarizacion.findUnique.mockResolvedValue(null);

    await expect(
      service.registerNegocio(
        {
          nombreDueno: 'Pablo',
          nickname: 'pablo',
          email: 'pablo@example.com',
          password: 'secret123',
          nombreNegocio: 'Cafe Nenufar',
          categoriaId: 3,
          codigoNenufarizacion: 'BAD-CODE',
        },
        { cookie: jest.fn() } as any,
      ),
    ).rejects.toMatchObject({
      code: 'CODIGO_NENUFARIZACION_INVALIDO',
      message: 'Código no válido o no activo',
      statusCode: 400,
    });

    expect(prisma.usuario.create).not.toHaveBeenCalled();
    expect(prisma.negocio.create).not.toHaveBeenCalled();
  });

  it('login devuelve 401 si la contraseña no coincide', async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

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
      emailVerificado: true,
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
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('reason=password_mismatch'),
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('wrong-pass'),
    );

    warnSpy.mockRestore();
  });

  it('login acepta nickname además de email', async () => {
    prisma.usuario.findFirst.mockResolvedValue({
      id: 7,
      nombre: 'Ada',
      nickname: 'ada',
      email: 'ada@example.com',
      password: await bcrypt.hash('secret123', 10),
      foto: null,
      biografia: null,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
      emailVerificado: true,
      estadoCuenta: EstadoCuenta.ACTIVA,
      rolGlobal: RolGlobal.USUARIO,
      petalosSaldo: 0,
      negocios: [],
    });
    prisma.usuario.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login(
      {
        nickname: 'Ada',
        password: 'secret123',
      },
      { cookie: jest.fn() } as any,
    );

    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: {
        nickname: {
          equals: 'Ada',
          mode: 'insensitive',
        },
      },
      select: expect.objectContaining({
        id: true,
        nombre: true,
        nickname: true,
        email: true,
        password: true,
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        access_token: 'access-token',
        id: 7,
        nickname: 'ada',
        email: 'ada@example.com',
      }),
    );
  });

  it('login bloquea cuentas eliminadas con un error claro', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 7,
      nombre: 'Ada',
      nickname: 'ada',
      email: 'ada@example.com',
      password: await bcrypt.hash('secret123', 10),
      foto: null,
      biografia: null,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
      emailVerificado: true,
      estadoCuenta: EstadoCuenta.ELIMINADA,
      eliminadoEn: new Date(),
      rolGlobal: RolGlobal.USUARIO,
      petalosSaldo: 0,
      negocios: [],
    });

    await expect(
      service.login(
        {
          email: 'ada@example.com',
          password: 'secret123',
        },
        { cookie: jest.fn() } as any,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        message: 'Esta cuenta ha sido eliminada.',
      }),
    );
  });

  it('login envía el welcome email una sola vez y lo marca al enviarse bien', async () => {
    authEmailWebhookService.isEnabled.mockReturnValue(true);
    authEmailWebhookService.sendWelcomeEmail.mockResolvedValue(true);
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
        emailVerificado: true,
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
    prisma.usuario.updateMany.mockResolvedValue({ count: 1 });
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

    expect(authEmailWebhookService.sendWelcomeEmail).toHaveBeenCalledWith(
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
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7, welcomeEmailSentAt: null },
        data: { welcomeEmailSentAt: expect.any(Date) },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        access_token: 'access-token',
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

  it('login con rememberMe true usa el TTL largo del refresh token', async () => {
    process.env.JWT_REFRESH_TTL = '1d';
    process.env.JWT_REFRESH_REMEMBER_TTL = '30d';
    authEmailWebhookService.isEnabled.mockReturnValue(false);
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
        emailVerificado: true,
        estadoCuenta: EstadoCuenta.ACTIVA,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 0,
        negocios: [],
      })
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        foto: null,
        biografia: null,
        creadoEn: new Date('2026-01-01T00:00:00.000Z'),
        actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
        emailVerificado: true,
        estadoCuenta: EstadoCuenta.ACTIVA,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 0,
        negocios: [],
      });
    prisma.usuario.update.mockResolvedValue({});
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const res = {
      cookie: jest.fn(),
    } as any;

    await service.login(
      {
        email: 'ada@example.com',
        password: 'secret123',
        rememberMe: true,
      },
      res,
    );

    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sub: 7, rememberMe: true }),
      { secret: 'test-access-secret', expiresIn: 15 * 60 },
    );
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sub: 7, rememberMe: true }),
      { secret: 'test-refresh-secret', expiresIn: 30 * 24 * 60 * 60 },
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
    authEmailWebhookService.isEnabled.mockReturnValue(true);
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
        emailVerificado: true,
        estadoCuenta: EstadoCuenta.ACTIVA,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 0,
        negocios: [],
      })
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        emailVerificado: true,
        negocios: [],
        welcomeEmailSentAt: new Date('2026-04-01T10:00:00.000Z'),
      });
    prisma.usuario.update.mockResolvedValue({});
    prisma.usuario.updateMany.mockResolvedValue({ count: 0 });
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

    expect(authEmailWebhookService.sendWelcomeEmail).not.toHaveBeenCalled();
    expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
  });

  it('login no se rompe si falla el envío del welcome email y no marca el campo', async () => {
    authEmailWebhookService.isEnabled.mockReturnValue(true);
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
        emailVerificado: true,
        estadoCuenta: EstadoCuenta.ACTIVA,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 0,
        negocios: [],
      })
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        emailVerificado: true,
        negocios: [],
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
    prisma.usuario.updateMany.mockResolvedValue({ count: 1 });
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    authEmailWebhookService.sendWelcomeEmail.mockRejectedValue(
      new Error('n8n failed'),
    );
    const loggerError = jest
      .spyOn(specHarness(service).logger, 'error')
      .mockImplementation(() => undefined);

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
    expect(authEmailWebhookService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { ultimoLoginEn: expect.any(Date) },
      }),
    );
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('Fallo notificando welcome email'),
      expect.any(String),
    );
    loggerError.mockRestore();
  });

  it('login sigue funcionando en local cuando el webhook n8n no está configurado', async () => {
    authEmailWebhookService.isEnabled.mockReturnValue(false);
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
    prisma.usuario.updateMany.mockResolvedValue({ count: 1 });
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
    expect(authEmailWebhookService.sendWelcomeEmail).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { ultimoLoginEn: expect.any(Date) },
      }),
    );
  });

  it('verificarEmail valida el código, marca emailVerificado y envía welcome', async () => {
    authEmailWebhookService.isEnabled.mockReturnValue(true);
    authEmailWebhookService.sendWelcomeEmail.mockResolvedValue(true);
    const codeHash = specHarness(service).hashEmailVerificationCode('123456');
    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        emailVerificado: false,
        codigoVerificacionEmailHash: codeHash,
        codigoVerificacionEmailExpiraEn: new Date(Date.now() + 60_000),
        codigoVerificacionEmailIntentos: 1,
        codigoVerificacionEmailUltimoEnvioEn: new Date(),
      })
      .mockResolvedValueOnce({
        id: 7,
        nombre: 'Ada',
        nickname: 'ada',
        email: 'ada@example.com',
        emailVerificado: true,
        negocios: [],
        welcomeEmailSentAt: null,
      });
    prisma.usuario.update.mockResolvedValueOnce({
      id: 7,
      nombre: 'Ada',
      nickname: 'ada',
      email: 'ada@example.com',
      foto: null,
      biografia: null,
      creadoEn: new Date('2026-01-01T00:00:00.000Z'),
      actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
      emailVerificado: true,
      estadoCuenta: EstadoCuenta.ACTIVA,
      eliminadoEn: null,
      rolGlobal: RolGlobal.USUARIO,
      petalosSaldo: 0,
      negocios: [],
    });
    prisma.usuario.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.verificarEmail({
      email: 'ADA@example.com',
      code: '123456',
    });

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({
        emailVerificado: true,
        verificadoEn: expect.any(Date),
        codigoVerificacionEmailHash: null,
        codigoVerificacionEmailExpiraEn: null,
        codigoVerificacionEmailIntentos: 0,
      }),
      select: expect.any(Object),
    });
    expect(authEmailWebhookService.sendWelcomeEmail).toHaveBeenCalledWith(
      'ada@example.com',
      'Ada',
    );
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        message: 'Email verificado correctamente',
        user: expect.objectContaining({
          id: 7,
          email: 'ada@example.com',
          emailVerificado: true,
        }),
      }),
    );
  });

  it('verificarEmail envía business_welcome para usuarios con negocio', async () => {
    authEmailWebhookService.isEnabled.mockReturnValue(true);
    authEmailWebhookService.sendBusinessWelcomeEmail.mockResolvedValue(true);
    const codeHash = specHarness(service).hashEmailVerificationCode('123456');
    const negocio = { id: 3, nombre: 'Cafe Demo' };
    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 9,
        nombre: 'Carmen',
        nickname: 'carmen',
        email: 'carmen@negocio.com',
        emailVerificado: false,
        codigoVerificacionEmailHash: codeHash,
        codigoVerificacionEmailExpiraEn: new Date(Date.now() + 60_000),
        codigoVerificacionEmailIntentos: 0,
        codigoVerificacionEmailUltimoEnvioEn: new Date(),
      })
      .mockResolvedValueOnce({
        id: 9,
        nombre: 'Carmen',
        nickname: 'carmen',
        email: 'carmen@negocio.com',
        emailVerificado: true,
        negocios: [negocio],
        welcomeEmailSentAt: null,
      });
    prisma.usuario.update.mockResolvedValueOnce({
      id: 9,
      nombre: 'Carmen',
      nickname: 'carmen',
      email: 'carmen@negocio.com',
      foto: null,
      biografia: null,
      creadoEn: new Date('2026-01-01T00:00:00.000Z'),
      actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
      emailVerificado: true,
      estadoCuenta: EstadoCuenta.ACTIVA,
      eliminadoEn: null,
      rolGlobal: RolGlobal.USUARIO,
      petalosSaldo: 0,
      negocios: [negocio],
    });
    prisma.usuario.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.verificarEmail({
      email: 'carmen@negocio.com',
      code: '123456',
    });

    expect(
      authEmailWebhookService.sendBusinessWelcomeEmail,
    ).toHaveBeenCalledWith('carmen@negocio.com', 'Carmen', 'Cafe Demo');
    expect(authEmailWebhookService.sendWelcomeEmail).not.toHaveBeenCalled();
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 9, welcomeEmailSentAt: null },
        data: { welcomeEmailSentAt: expect.any(Date) },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        user: expect.objectContaining({
          id: 9,
          email: 'carmen@negocio.com',
          rol: 'negocio',
          negocio: expect.objectContaining({ id: 3, nombre: 'Cafe Demo' }),
        }),
      }),
    );
  });

  it('verificarEmail no se rompe si falla business_welcome y no marca welcomeEmailSentAt', async () => {
    authEmailWebhookService.isEnabled.mockReturnValue(true);
    authEmailWebhookService.sendBusinessWelcomeEmail.mockRejectedValue(
      new Error('n8n down'),
    );
    const loggerError = jest
      .spyOn(specHarness(service).logger, 'error')
      .mockImplementation(() => undefined);
    const codeHash = specHarness(service).hashEmailVerificationCode('123456');
    const negocio = { id: 4, nombre: 'Tienda Demo' };
    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 10,
        nombre: 'Ines',
        nickname: 'ines',
        email: 'ines@negocio.com',
        emailVerificado: false,
        codigoVerificacionEmailHash: codeHash,
        codigoVerificacionEmailExpiraEn: new Date(Date.now() + 60_000),
        codigoVerificacionEmailIntentos: 0,
        codigoVerificacionEmailUltimoEnvioEn: new Date(),
      })
      .mockResolvedValueOnce({
        id: 10,
        nombre: 'Ines',
        nickname: 'ines',
        email: 'ines@negocio.com',
        emailVerificado: true,
        negocios: [negocio],
        welcomeEmailSentAt: null,
      });
    prisma.usuario.update.mockResolvedValueOnce({
      id: 10,
      nombre: 'Ines',
      nickname: 'ines',
      email: 'ines@negocio.com',
      foto: null,
      biografia: null,
      creadoEn: new Date('2026-01-01T00:00:00.000Z'),
      actualizadoEn: new Date('2026-01-02T00:00:00.000Z'),
      emailVerificado: true,
      estadoCuenta: EstadoCuenta.ACTIVA,
      eliminadoEn: null,
      rolGlobal: RolGlobal.USUARIO,
      petalosSaldo: 0,
      negocios: [negocio],
    });

    const result = await service.verificarEmail({
      email: 'ines@negocio.com',
      code: '123456',
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        message: 'Email verificado correctamente',
      }),
    );
    expect(
      authEmailWebhookService.sendBusinessWelcomeEmail,
    ).toHaveBeenCalledWith('ines@negocio.com', 'Ines', 'Tienda Demo');
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('Fallo notificando business_welcome email'),
      expect.any(String),
    );
    loggerError.mockRestore();
  });

  it('verificarEmail incrementa intentos si el código es incorrecto', async () => {
    const codeHash = specHarness(service).hashEmailVerificationCode('123456');
    const loggerWarn = jest
      .spyOn(specHarness(service).logger, 'warn')
      .mockImplementation(() => undefined);
    prisma.usuario.findUnique.mockResolvedValue({
      id: 7,
      nombre: 'Ada',
      nickname: 'ada',
      email: 'ada@example.com',
      emailVerificado: false,
      codigoVerificacionEmailHash: codeHash,
      codigoVerificacionEmailExpiraEn: new Date(Date.now() + 60_000),
      codigoVerificacionEmailIntentos: 1,
      codigoVerificacionEmailUltimoEnvioEn: new Date(),
    });
    prisma.usuario.update.mockResolvedValue({});

    await expect(
      service.verificarEmail({
        email: 'ada@example.com',
        code: '654321',
      }),
    ).rejects.toMatchObject({
      code: 'VERIFICATION_CODE_INVALID',
      message: 'Código de verificación incorrecto',
    });

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        codigoVerificacionEmailIntentos: { increment: 1 },
      },
    });
    expect(loggerWarn.mock.calls.flat().join(' ')).not.toContain(
      'ada@example.com',
    );
    loggerWarn.mockRestore();
  });

  it('reenviarCodigoEmail regenera código y respeta respuesta segura', async () => {
    authEmailWebhookService.sendConfirmationCode.mockResolvedValue(true);
    prisma.usuario.findUnique.mockResolvedValue({
      id: 7,
      nombre: 'Ada',
      nickname: 'ada',
      email: 'ada@example.com',
      emailVerificado: false,
      codigoVerificacionEmailHash: 'old-hash',
      codigoVerificacionEmailExpiraEn: new Date(Date.now() - 60_000),
      codigoVerificacionEmailIntentos: 2,
      codigoVerificacionEmailUltimoEnvioEn: new Date(Date.now() - 90_000),
    });
    prisma.usuario.update.mockResolvedValue({});

    const result = await service.reenviarCodigoEmail({
      email: 'ada@example.com',
    });

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({
        codigoVerificacionEmailHash: expect.any(String),
        codigoVerificacionEmailExpiraEn: expect.any(Date),
        codigoVerificacionEmailIntentos: 0,
        codigoVerificacionEmailUltimoEnvioEn: expect.any(Date),
      }),
    });
    expect(authEmailWebhookService.sendConfirmationCode).toHaveBeenCalledWith(
      'ada@example.com',
      'Ada',
      expect.stringMatching(/^\d{6}$/),
    );
    expect(result).toEqual({
      ok: true,
      message: 'Código reenviado',
      email: 'ad***@example.com',
      expiresInMinutes: 5,
    });
  });

  it('reenviarCodigoEmail no reutiliza el código anterior si se vuelve a generar igual', async () => {
    const oldHash = specHarness(service).hashEmailVerificationCode('222222');
    const generateSpy = jest
      .spyOn(specHarness(service), 'generateEmailVerificationCode')
      .mockReturnValueOnce('222222')
      .mockReturnValueOnce('333333');
    authEmailWebhookService.sendConfirmationCode.mockResolvedValue(true);
    prisma.usuario.findUnique.mockResolvedValue({
      id: 7,
      nombre: 'Ada',
      nickname: 'ada',
      email: 'ada@example.com',
      emailVerificado: false,
      codigoVerificacionEmailHash: oldHash,
      codigoVerificacionEmailExpiraEn: new Date(Date.now() - 60_000),
      codigoVerificacionEmailIntentos: 2,
      codigoVerificacionEmailUltimoEnvioEn: new Date(Date.now() - 90_000),
    });
    prisma.usuario.update.mockResolvedValue({});

    await service.reenviarCodigoEmail({
      email: 'ada@example.com',
    });

    expect(generateSpy).toHaveBeenCalledTimes(2);
    expect(authEmailWebhookService.sendConfirmationCode).toHaveBeenCalledWith(
      'ada@example.com',
      'Ada',
      '333333',
    );
    expect(
      prisma.usuario.update.mock.calls[0][0].data.codigoVerificacionEmailHash,
    ).toBe(specHarness(service).hashEmailVerificationCode('333333'));
    expect(
      prisma.usuario.update.mock.calls[0][0].data.codigoVerificacionEmailHash,
    ).not.toBe(oldHash);

    generateSpy.mockRestore();
  });

  it('reenviarCodigoEmail limita reenvíos dentro de 60 segundos', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 7,
      nombre: 'Ada',
      nickname: 'ada',
      email: 'ada@example.com',
      emailVerificado: false,
      codigoVerificacionEmailHash: 'old-hash',
      codigoVerificacionEmailExpiraEn: new Date(Date.now() + 60_000),
      codigoVerificacionEmailIntentos: 0,
      codigoVerificacionEmailUltimoEnvioEn: new Date(),
    });

    await expect(
      service.reenviarCodigoEmail({
        email: 'ada@example.com',
      }),
    ).rejects.toMatchObject({
      message: 'Espera 60 segundos antes de pedir otro código',
    });
    expect(authEmailWebhookService.sendConfirmationCode).not.toHaveBeenCalled();
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
      eliminadoEn: null,
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
      rolGlobal: RolGlobal.USUARIO,
    });
    prisma.usuario.findUnique.mockResolvedValue({
      id: 12,
      email: 'ada@example.com',
      nickname: 'ada',
      rolGlobal: RolGlobal.USUARIO,
      estadoCuenta: EstadoCuenta.ACTIVA,
      eliminadoEn: null,
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

  it('refresh conserva el TTL largo cuando el refresh token venía de rememberMe', async () => {
    process.env.JWT_REFRESH_TTL = '1d';
    process.env.JWT_REFRESH_REMEMBER_TTL = '30d';
    jwtService.verifyAsync.mockResolvedValue({
      sub: 12,
      email: 'ada@example.com',
      nickname: 'ada',
      rolGlobal: RolGlobal.USUARIO,
      rememberMe: true,
    });
    prisma.usuario.findUnique.mockResolvedValue({
      id: 12,
      email: 'ada@example.com',
      nickname: 'ada',
      rolGlobal: RolGlobal.USUARIO,
      estadoCuenta: EstadoCuenta.ACTIVA,
      eliminadoEn: null,
    });
    jwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    const res = {
      cookie: jest.fn(),
    } as any;

    await service.refresh(
      {
        cookies: {
          refresh_token: 'incoming-refresh-token',
        },
        headers: {},
      } as any,
      res,
    );

    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sub: 12, rememberMe: true }),
      { secret: 'test-refresh-secret', expiresIn: 30 * 24 * 60 * 60 },
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      2,
      'refresh_token',
      'new-refresh-token',
      expect.objectContaining({
        maxAge: 30 * 24 * 60 * 60 * 1000,
      }),
    );
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
      rolGlobal: RolGlobal.USUARIO,
    });
    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 9,
        email: 'demo@example.com',
        nickname: 'demo',
        rolGlobal: RolGlobal.USUARIO,
        estadoCuenta: EstadoCuenta.ACTIVA,
        eliminadoEn: null,
      })
      .mockResolvedValueOnce({
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
        eliminadoEn: null,
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

  it('me usa refresh_token y rota cookies cuando el access_token ya no es válido', async () => {
    process.env.JWT_REFRESH_TTL = '1d';
    process.env.JWT_REFRESH_REMEMBER_TTL = '30d';
    jwtService.verifyAsync
      .mockRejectedValueOnce(new Error('jwt expired'))
      .mockResolvedValueOnce({
        sub: 9,
        email: 'demo@example.com',
        nickname: 'demo',
        rolGlobal: RolGlobal.USUARIO,
        rememberMe: true,
      });
    jwtService.signAsync
      .mockResolvedValueOnce('rotated-access-token')
      .mockResolvedValueOnce('rotated-refresh-token');
    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 9,
        email: 'demo@example.com',
        nickname: 'demo',
        rolGlobal: RolGlobal.USUARIO,
        estadoCuenta: EstadoCuenta.ACTIVA,
        eliminadoEn: null,
      })
      .mockResolvedValueOnce({
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
        eliminadoEn: null,
        rolGlobal: RolGlobal.USUARIO,
        petalosSaldo: 8,
        negocios: [],
      });

    const res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as any;

    const result = await service.me(
      {
        cookies: {
          access_token: 'expired-access-token',
          refresh_token: 'valid-refresh-token',
        },
        headers: {},
      } as any,
      res,
    );

    expect(jwtService.verifyAsync).toHaveBeenNthCalledWith(
      1,
      'expired-access-token',
      { secret: 'test-access-secret' },
    );
    expect(jwtService.verifyAsync).toHaveBeenNthCalledWith(
      2,
      'valid-refresh-token',
      { secret: 'test-refresh-secret' },
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      2,
      'refresh_token',
      'rotated-refresh-token',
      expect.objectContaining({
        maxAge: 30 * 24 * 60 * 60 * 1000,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 9,
        email: 'demo@example.com',
      }),
    );
  });

  it('me limpia cookies y devuelve 401 si la cuenta fue eliminada', async () => {
    const res = {
      clearCookie: jest.fn(),
    } as any;
    prisma.usuario.findUnique.mockResolvedValue({
      id: 9,
      email: 'demo@example.com',
      nickname: 'demo',
      rolGlobal: RolGlobal.USUARIO,
      estadoCuenta: EstadoCuenta.ELIMINADA,
      eliminadoEn: new Date(),
    });

    await expect(
      service.me(
        {
          cookies: {},
          headers: {},
          user: {
            id: 9,
          },
        } as any,
        res,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        message: 'Esta cuenta ha sido eliminada.',
      }),
    );

    expect(res.clearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.objectContaining({
        httpOnly: true,
      }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({
        httpOnly: true,
      }),
    );
  });
});
