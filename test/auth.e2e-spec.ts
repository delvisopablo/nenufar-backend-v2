import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import request from 'supertest';
import {
  createTestApp,
  registerAndLogin,
  resetDatabase,
  seedMinimo,
  verifyUsuarioEmail,
} from './helpers';

function extractCookieValue(
  setCookie: string[] | undefined,
  cookieName: string,
) {
  const rawCookie = setCookie?.find((cookie) =>
    cookie.startsWith(`${cookieName}=`),
  );

  if (!rawCookie) {
    return null;
  }

  const [pair] = rawCookie.split(';', 1);
  return pair.slice(`${cookieName}=`.length);
}

describe('Auth E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /auth/registro crea usuario pendiente de verificación y devuelve 201', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        nombre: 'Ana',
        nickname: 'ana_test',
        email: 'ana@example.com',
        password: 'secreta123',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        requiresEmailVerification: true,
        emailVerification: expect.objectContaining({
          email: expect.any(String),
        }),
      }),
    );

    const usuario = await prisma.usuario.findUnique({
      where: { email: 'ana@example.com' },
    });
    expect(usuario).toEqual(
      expect.objectContaining({
        nombre: 'Ana',
        nickname: 'ana_test',
        emailVerificado: false,
      }),
    );
  });

  it('POST /auth/registro de un email pendiente reenvía el código en vez de fallar', async () => {
    await request(app.getHttpServer()).post('/auth/registro').send({
      nombre: 'Ana',
      nickname: 'ana_test',
      email: 'ana@example.com',
      password: 'secreta123',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        nombre: 'Ana',
        nickname: 'ana_test',
        email: 'ana@example.com',
        password: 'secreta123',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        requiresEmailVerification: true,
      }),
    );
  });

  it('POST /auth/registro rechaza email ya verificado con 409', async () => {
    await request(app.getHttpServer()).post('/auth/registro').send({
      nombre: 'Ana',
      nickname: 'ana_test',
      email: 'ana@example.com',
      password: 'secreta123',
    });
    await verifyUsuarioEmail(app, 'ana@example.com');

    const response = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        nombre: 'Otra Ana',
        nickname: 'ana_test_2',
        email: 'ana@example.com',
        password: 'secreta123',
      })
      .expect(409);

    expect(response.body).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'EMAIL_ALREADY_IN_USE',
        message: 'Este correo ya está en uso.',
        fieldErrors: { email: 'Este correo ya está en uso.' },
        error: expect.objectContaining({
          code: 'EMAIL_ALREADY_IN_USE',
          message: 'Este correo ya está en uso.',
          requestId: expect.any(String),
        }),
      }),
    );
  });

  it('POST /auth/registro rechaza password corta con 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        nombre: 'Ana',
        nickname: 'ana_test',
        email: 'ana@example.com',
        password: '123',
      })
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'PASSWORD_TOO_SHORT',
        message: 'La contraseña debe tener al menos 8 caracteres.',
        error: expect.objectContaining({
          code: 'PASSWORD_TOO_SHORT',
          message: 'La contraseña debe tener al menos 8 caracteres.',
          requestId: expect.any(String),
          details: expect.objectContaining({
            fields: expect.objectContaining({
              password: expect.any(Array),
            }),
          }),
        }),
      }),
    );
  });

  it('POST /auth/registro-negocio devuelve detalles de validación concretos', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/registro-negocio')
      .send({
        email: 'correo-invalido',
        password: '123',
        nombreNegocio: '',
        categoriaId: 'abc',
      })
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Datos de entrada inválidos',
          requestId: expect.any(String),
          details: expect.objectContaining({
            fields: expect.objectContaining({
              categoriaId: expect.any(Array),
              nombreNegocio: expect.any(Array),
              nickname: expect.any(Array),
              email: expect.any(Array),
            }),
          }),
        }),
      }),
    );
  });

  it('POST /auth/registro-negocio acepta aliases de frontend y guarda nenufarActivo', async () => {
    const { categoria, subcategoria } = await seedMinimo(prisma);

    const response = await request(app.getHttpServer())
      .post('/auth/registro-negocio')
      .send({
        nombre: 'Pablo Delviso',
        nickname: 'pablo_negocio',
        email: 'pablo-negocio@example.com',
        password: 'secreta123',
        nombreNegocio: 'Cafe Nenufar',
        nicknameNegocio: 'cafe-nenufar',
        categoriaId: categoria.id,
        subcategoriaId: subcategoria.id,
        descripcion: 'Cafe de especialidad de barrio',
        direccion: 'Calle Mayor 14',
        nenufarActivo: 'nenufar-loto-rosa',
        codigoNenufarizacion: '',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        requiresEmailVerification: true,
        emailVerification: expect.objectContaining({
          email: expect.any(String),
        }),
      }),
    );

    // El registro de negocio también exige verificación de email antes de
    // iniciar sesión (las cookies se establecen en /auth/verificar-email).
    await verifyUsuarioEmail(app, 'pablo-negocio@example.com');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'pablo-negocio@example.com', password: 'secreta123' })
      .expect(201);

    expect(loginResponse.body).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        email: 'pablo-negocio@example.com',
      }),
    );
    expect(loginResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('access_token=')]),
    );

    const negocio = await prisma.negocio.findFirst({
      where: { slug: 'cafe-nenufar' },
      select: {
        nombre: true,
        historia: true,
        categoriaId: true,
        subcategoriaId: true,
        nenufarActivo: true,
        nenufarAsset: true,
      },
    });

    expect(negocio).toEqual({
      nombre: 'Cafe Nenufar',
      historia: 'Cafe de especialidad de barrio',
      categoriaId: categoria.id,
      subcategoriaId: subcategoria.id,
      nenufarActivo: 'nenufar-loto-rosa',
      nenufarAsset: 'nenufar-loto-rosa',
    });
  });

  it('POST /auth/registro-negocio devuelve error claro si el código informado es inválido', async () => {
    const { categoria } = await seedMinimo(prisma);

    const response = await request(app.getHttpServer())
      .post('/auth/registro-negocio')
      .send({
        nombre: 'Pablo Delviso',
        nickname: 'pablo_codigo',
        email: 'pablo-codigo@example.com',
        password: 'secreta123',
        nombreNegocio: 'Floristeria Nenufar',
        categoriaId: categoria.id,
        codigoNenufarizacion: 'CODIGO-INVALIDO',
      })
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'CODIGO_NENUFARIZACION_INVALIDO',
          message: 'Código no válido o no activo',
          requestId: expect.any(String),
        }),
      }),
    );
  });

  it('POST /auth/login login correcto devuelve 200 y setea cookie access_token', async () => {
    await request(app.getHttpServer()).post('/auth/registro').send({
      nombre: 'Ana',
      nickname: 'ana_test',
      email: 'ana@example.com',
      password: 'secreta123',
    });
    await verifyUsuarioEmail(app, 'ana@example.com');

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana@example.com',
        password: 'secreta123',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        id: expect.any(Number),
        email: 'ana@example.com',
      }),
    );
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('access_token=')]),
    );
  });

  it('POST /auth/login admite nickname además de email', async () => {
    await request(app.getHttpServer()).post('/auth/registro').send({
      nombre: 'Ana',
      nickname: 'ana_test',
      email: 'ana@example.com',
      password: 'secreta123',
    });
    await verifyUsuarioEmail(app, 'ana@example.com');

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        nickname: 'ana_test',
        password: 'secreta123',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        id: expect.any(Number),
        email: 'ana@example.com',
        nickname: 'ana_test',
      }),
    );
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('access_token=')]),
    );
  });

  it('POST /auth/login login con password incorrecta devuelve 401', async () => {
    await request(app.getHttpServer()).post('/auth/registro').send({
      nombre: 'Ana',
      nickname: 'ana_test',
      email: 'ana@example.com',
      password: 'secreta123',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana@example.com',
        password: 'otra-clave',
      })
      .expect(401);

    expect(response.body).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'AUTH_ERROR',
          message: 'Credenciales incorrectas.',
          requestId: expect.any(String),
        }),
      }),
    );
  });

  it('POST /auth/login con email inexistente devuelve 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'inexistente@example.com',
        password: 'secreta123',
      })
      .expect(401);

    expect(response.body).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'AUTH_ERROR',
          message: 'Credenciales incorrectas.',
          requestId: expect.any(String),
        }),
      }),
    );
  });

  it('GET /auth/me con cookie válida devuelve perfil del usuario', async () => {
    const { cookie, usuarioId } = await registerAndLogin(
      app,
      'perfil@example.com',
      'secreta123',
    );

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: usuarioId,
        email: 'perfil@example.com',
        petalosSaldo: 0,
      }),
    );
  });

  it('GET /auth/me sin cookie devuelve 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);

    expect(response.body).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: 'AUTH_ERROR',
          message: 'Unauthorized',
          requestId: expect.any(String),
        }),
      }),
    );
  });

  it('GET /auth/me con Authorization Bearer válida devuelve perfil del usuario', async () => {
    await request(app.getHttpServer()).post('/auth/registro').send({
      nombre: 'Ana',
      nickname: 'ana_test',
      email: 'ana@example.com',
      password: 'secreta123',
    });
    await verifyUsuarioEmail(app, 'ana@example.com');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana@example.com',
        password: 'secreta123',
      })
      .expect(201);

    const accessToken = extractCookieValue(
      loginResponse.headers['set-cookie'] as unknown as string[] | undefined,
      'access_token',
    );

    expect(accessToken).toBeTruthy();

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        email: 'ana@example.com',
      }),
    );
  });
});
