import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import request from 'supertest';
import {
  createNegocio,
  createTestApp,
  registerAndLogin,
  resetDatabase,
  seedMinimo,
} from './helpers';

function nextBusinessDayYmd() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 1);

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().slice(0, 10);
}

describe('Persistencia básica E2E', () => {
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

  it('POST /negocios crea negocio y lo persiste en BD', async () => {
    const { categoria, subcategoria } = await seedMinimo(prisma);
    const { cookie } = await registerAndLogin(
      app,
      'negocio@example.com',
      'secreta123',
    );

    const negocio = await createNegocio(app, cookie, {
      nombre: 'Negocio Test',
      fechaFundacion: '2020-01-01',
      categoriaId: categoria.id,
      subcategoriaId: subcategoria.id,
      direccion: 'Calle Falsa 123',
    });

    const response = await request(app.getHttpServer())
      .get(`/negocios/${negocio.id}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: negocio.id,
        nombre: 'Negocio Test',
        direccion: 'Calle Falsa 123',
      }),
    );
  });

  it('POST /negocios el negocio creado tiene duenoId igual al usuario autenticado', async () => {
    const { categoria, subcategoria } = await seedMinimo(prisma);
    const { cookie, usuarioId } = await registerAndLogin(
      app,
      'dueno@example.com',
      'secreta123',
    );

    const negocio = await createNegocio(app, cookie, {
      nombre: 'Negocio Dueño',
      fechaFundacion: '2020-01-01',
      categoriaId: categoria.id,
      subcategoriaId: subcategoria.id,
    });

    expect(negocio).toEqual(
      expect.objectContaining({
        duenoId: usuarioId,
      }),
    );
  });

  it('POST /resenas crea reseña y aparece en GET /negocios/:id/resenas', async () => {
    const { categoria, subcategoria } = await seedMinimo(prisma);
    const { cookie } = await registerAndLogin(
      app,
      'resena@example.com',
      'secreta123',
    );

    const negocio = await createNegocio(app, cookie, {
      nombre: 'Negocio Reseñas',
      fechaFundacion: '2020-01-01',
      categoriaId: categoria.id,
      subcategoriaId: subcategoria.id,
    });

    const createResponse = await request(app.getHttpServer())
      .post('/resenas')
      .set('Cookie', cookie)
      .send({
        negocioId: negocio.id,
        contenido: 'Muy buen sitio',
        puntuacion: 5,
      })
      .expect(201);

    expect(createResponse.body).toEqual(
      expect.objectContaining({
        negocioId: negocio.id,
        contenido: 'Muy buen sitio',
        puntuacion: 5,
      }),
    );

    const listResponse = await request(app.getHttpServer())
      .get(`/negocios/${negocio.id}/resenas`)
      .expect(200);

    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createResponse.body.id,
          contenido: 'Muy buen sitio',
        }),
      ]),
    );
  });

  it('POST /resenas crea PetaloTx automáticamente y actualiza saldo en GET /auth/me', async () => {
    const { categoria, subcategoria } = await seedMinimo(prisma);
    const { cookie, usuarioId } = await registerAndLogin(
      app,
      'petalos@example.com',
      'secreta123',
    );

    const negocio = await createNegocio(app, cookie, {
      nombre: 'Negocio Pétalos',
      fechaFundacion: '2020-01-01',
      categoriaId: categoria.id,
      subcategoriaId: subcategoria.id,
    });

    await request(app.getHttpServer())
      .post('/resenas')
      .set('Cookie', cookie)
      .send({
        negocioId: negocio.id,
        contenido: 'Me gustó mucho',
        puntuacion: 4,
      })
      .expect(201);

    const txCount = await prisma.petaloTx.count({
      where: { usuarioId },
    });
    expect(txCount).toBe(1);

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(meResponse.body).toEqual(
      expect.objectContaining({
        id: usuarioId,
        petalosSaldo: 5,
      }),
    );
  });

  it('POST /resenas no permite dos reseñas del mismo usuario al mismo negocio', async () => {
    const { categoria, subcategoria } = await seedMinimo(prisma);
    const { cookie } = await registerAndLogin(
      app,
      'duplicada@example.com',
      'secreta123',
    );

    const negocio = await createNegocio(app, cookie, {
      nombre: 'Negocio Duplicado',
      fechaFundacion: '2020-01-01',
      categoriaId: categoria.id,
      subcategoriaId: subcategoria.id,
    });

    const payload = {
      negocioId: negocio.id,
      contenido: 'Solo una reseña por negocio',
      puntuacion: 5,
    };

    await request(app.getHttpServer())
      .post('/resenas')
      .set('Cookie', cookie)
      .send(payload)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/resenas')
      .set('Cookie', cookie)
      .send(payload)
      .expect(409);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 409,
        message: 'Ya existe una reseña tuya para este negocio',
      }),
    );
  });

  it('POST /reservas crea reserva en un slot válido', async () => {
    const { categoria, subcategoria } = await seedMinimo(prisma);
    const { cookie, usuarioId } = await registerAndLogin(
      app,
      'reserva@example.com',
      'secreta123',
    );

    const negocio = await createNegocio(app, cookie, {
      nombre: 'Negocio Reservas',
      fechaFundacion: '2020-01-01',
      categoriaId: categoria.id,
      subcategoriaId: subcategoria.id,
      intervaloReserva: 30,
      horario: {
        weekly: {
          mon: [['09:00', '12:00']],
          tue: [['09:00', '12:00']],
          wed: [['09:00', '12:00']],
          thu: [['09:00', '12:00']],
          fri: [['09:00', '12:00']],
          sat: [],
          sun: [],
        },
      },
    });

    const availability = await request(app.getHttpServer())
      .get(`/negocios/${negocio.id}/availability`)
      .query({ date: nextBusinessDayYmd() })
      .expect(200);

    expect(availability.body.slots).toEqual(expect.any(Array));
    expect(availability.body.slots.length).toBeGreaterThan(0);

    const slot = availability.body.slots[0] as string;

    const response = await request(app.getHttpServer())
      .post(`/negocios/${negocio.id}/reservas`)
      .set('Cookie', cookie)
      .send({
        fecha: slot,
        nota: 'Mesa tranquila',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        negocioId: negocio.id,
        usuarioId,
      }),
    );
  });

  it('POST /reservas rechaza reserva en slot ya ocupado', async () => {
    const { categoria, subcategoria } = await seedMinimo(prisma);
    const { cookie } = await registerAndLogin(
      app,
      'reserva-ocupada@example.com',
      'secreta123',
    );

    const negocio = await createNegocio(app, cookie, {
      nombre: 'Negocio Reservas Ocupadas',
      fechaFundacion: '2020-01-01',
      categoriaId: categoria.id,
      subcategoriaId: subcategoria.id,
      intervaloReserva: 30,
      horario: {
        weekly: {
          mon: [['09:00', '12:00']],
          tue: [['09:00', '12:00']],
          wed: [['09:00', '12:00']],
          thu: [['09:00', '12:00']],
          fri: [['09:00', '12:00']],
          sat: [],
          sun: [],
        },
      },
    });

    const availability = await request(app.getHttpServer())
      .get(`/negocios/${negocio.id}/availability`)
      .query({ date: nextBusinessDayYmd() })
      .expect(200);

    const slot = availability.body.slots[0] as string;

    await request(app.getHttpServer())
      .post(`/negocios/${negocio.id}/reservas`)
      .set('Cookie', cookie)
      .send({ fecha: slot })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/negocios/${negocio.id}/reservas`)
      .set('Cookie', cookie)
      .send({ fecha: slot })
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 400,
        message: 'Slot no disponible',
      }),
    );
  });
});
