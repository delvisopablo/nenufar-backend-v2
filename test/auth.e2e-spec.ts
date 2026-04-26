import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import request from 'supertest';
import { createTestApp, registerAndLogin, resetDatabase } from './helpers';

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

  it('POST /auth/registro crea usuario y devuelve 201', async () => {
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
        id: expect.any(Number),
        nombre: 'Ana',
        nickname: 'ana_test',
        email: 'ana@example.com',
      }),
    );

    const usuario = await prisma.usuario.findUnique({
      where: { email: 'ana@example.com' },
    });
    expect(usuario).toEqual(
      expect.objectContaining({
        nombre: 'Ana',
        nickname: 'ana_test',
      }),
    );
  });

  it('POST /auth/registro rechaza email duplicado con 409', async () => {
    await request(app.getHttpServer()).post('/auth/registro').send({
      nombre: 'Ana',
      nickname: 'ana_test',
      email: 'ana@example.com',
      password: 'secreta123',
    });

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
        error: expect.objectContaining({
          code: 'CONFLICT',
          message: 'Email o nickname ya en uso',
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
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Datos de entrada inválidos',
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

  it('POST /auth/login login correcto devuelve 200 y setea cookie access_token', async () => {
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
        password: 'secreta123',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        email: 'ana@example.com',
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
          message: 'Credenciales inválidas',
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
          message: 'Credenciales inválidas',
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
});
