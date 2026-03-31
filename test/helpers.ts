import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Categoria, PrismaClient, Subcategoria } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../src/app.module';

type CookieHeader = string[];

export async function createTestApp() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
  };
}

export async function resetDatabase(prisma: PrismaClient) {
  const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename ASC
  `);

  if (tables.length === 0) {
    return;
  }

  const tableList = tables
    .map(({ tablename }) => `"public"."${tablename}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`,
  );
}

export async function registerAndLogin(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ cookie: CookieHeader; usuarioId: number }> {
  const nickname = `u_${email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).slice(2, 8)}`;

  const registerResponse = await request(app.getHttpServer())
    .post('/auth/registro')
    .send({
      nombre: 'Usuario E2E',
      nickname,
      email,
      password,
    })
    .expect(201);

  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  const rawCookie = loginResponse.headers['set-cookie'];

  return {
    cookie: Array.isArray(rawCookie) ? rawCookie : rawCookie ? [rawCookie] : [],
    usuarioId: registerResponse.body.id as number,
  };
}

export async function createNegocio(
  app: INestApplication,
  cookie: CookieHeader,
  data: Record<string, unknown>,
) {
  const response = await request(app.getHttpServer())
    .post('/negocios')
    .set('Cookie', cookie)
    .send(data)
    .expect(201);

  return response.body;
}

export async function seedMinimo(prisma: PrismaClient): Promise<{
  categoria: Categoria;
  subcategoria: Subcategoria;
}> {
  const categoria = await prisma.categoria.create({
    data: {
      nombre: 'Categoria E2E',
    },
  });

  const subcategoria = await prisma.subcategoria.create({
    data: {
      nombre: 'Subcategoria E2E',
      categoriaId: categoria.id,
    },
  });

  return { categoria, subcategoria };
}
