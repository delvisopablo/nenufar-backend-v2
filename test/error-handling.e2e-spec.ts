import {
  Body,
  ConflictException,
  Controller,
  Get,
  INestApplication,
  Post,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IsEmail, IsString, MinLength } from 'class-validator';
import request from 'supertest';
import { setupApp } from '../src/app.setup';

class ErrorValidationDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

@Controller('test-errors')
class ErrorHandlingTestController {
  @Get('ok')
  ok() {
    return { ok: true };
  }

  @Get('conflict')
  conflict() {
    throw new ConflictException('Recurso duplicado');
  }

  @Get('internal')
  internal() {
    throw new Error('Fallo no controlado de test');
  }

  @Get('pg-unique')
  pgUnique() {
    throw {
      code: '23505',
      constraint: 'Usuario_email_key',
      table: 'Usuario',
    };
  }

  @Post('validation')
  validation(@Body() _dto: ErrorValidationDto) {
    return { ok: true };
  }
}

describe('Error handling E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [ErrorHandlingTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('incluye x-request-id en respuestas correctas', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-errors/ok')
      .set('x-request-id', 'test-request-id')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('test-request-id');
    expect(response.body).toEqual({ ok: true });
  });

  it('normaliza 404 con requestId', async () => {
    const response = await request(app.getHttpServer())
      .get('/ruta-inexistente')
      .expect(404);

    expect(response.body).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'NOT_FOUND',
        message: expect.any(String),
        requestId: expect.any(String),
        details: {},
      }),
    });
    expect(response.headers['x-request-id']).toBe(response.body.error.requestId);
  });

  it('normaliza errores de validación a 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/test-errors/validation')
      .send({ email: 'no-es-email', password: '123' })
      .expect(400);

    expect(response.body).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos',
        requestId: expect.any(String),
        details: expect.objectContaining({
          fields: expect.objectContaining({
            email: expect.any(Array),
            password: expect.any(Array),
          }),
        }),
      }),
    });
  });

  it('normaliza conflicto a 409', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-errors/conflict')
      .expect(409);

    expect(response.body).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'CONFLICT',
        message: 'Recurso duplicado',
        requestId: expect.any(String),
      }),
    });
  });

  it('normaliza error interno a 500 sin filtrar stack al cliente', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-errors/internal')
      .expect(500);

    expect(response.body).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
        requestId: expect.any(String),
        details: {},
      }),
    });
    expect(response.body.error.stack).toBeUndefined();
  });

  it('mapea unique violation de PostgreSQL a 409', async () => {
    const response = await request(app.getHttpServer())
      .get('/test-errors/pg-unique')
      .expect(409);

    expect(response.body).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'CONFLICT',
        message: 'Ya existe un registro con esos datos',
        requestId: expect.any(String),
        details: expect.objectContaining({
          constraint: 'Usuario_email_key',
          postgresCode: '23505',
        }),
      }),
    });
  });
});
