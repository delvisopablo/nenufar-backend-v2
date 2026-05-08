import { EstadoCuenta, PrismaClient, RolGlobal } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEV_ADMIN_EMAIL = 'admin@minenufar.com';
const DEV_ADMIN_NICKNAME = 'admin';
const DEV_ADMIN_PASSWORD = 'admin1234';
const DEV_ADMIN_NOMBRE = 'Admin Nenufar';

async function main() {
  const passwordHash = await bcrypt.hash(DEV_ADMIN_PASSWORD, 10);
  const existing = await prisma.usuario.findFirst({
    where: {
      OR: [{ email: DEV_ADMIN_EMAIL }, { nickname: DEV_ADMIN_NICKNAME }],
    },
    select: {
      id: true,
      email: true,
      nickname: true,
    },
  });

  const admin = existing
    ? await prisma.usuario.update({
        where: { id: existing.id },
        data: {
          nombre: DEV_ADMIN_NOMBRE,
          email: DEV_ADMIN_EMAIL,
          nickname: DEV_ADMIN_NICKNAME,
          password: passwordHash,
          rolGlobal: RolGlobal.ADMIN,
          estadoCuenta: EstadoCuenta.ACTIVA,
          eliminadoEn: null,
          emailVerificado: true,
          verificadoEn: new Date(),
        },
        select: {
          id: true,
          nombre: true,
          email: true,
          nickname: true,
          rolGlobal: true,
          estadoCuenta: true,
        },
      })
    : await prisma.usuario.create({
        data: {
          nombre: DEV_ADMIN_NOMBRE,
          email: DEV_ADMIN_EMAIL,
          nickname: DEV_ADMIN_NICKNAME,
          password: passwordHash,
          rolGlobal: RolGlobal.ADMIN,
          estadoCuenta: EstadoCuenta.ACTIVA,
          emailVerificado: true,
          verificadoEn: new Date(),
        },
        select: {
          id: true,
          nombre: true,
          email: true,
          nickname: true,
          rolGlobal: true,
          estadoCuenta: true,
        },
      });

  console.log('Admin de desarrollo listo:', admin);
}

main()
  .catch((error) => {
    console.error('No se ha podido crear el admin de desarrollo.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
