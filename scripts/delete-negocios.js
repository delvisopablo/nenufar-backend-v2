const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ids = [5, 6, 7, 8, 9, 10];

async function main() {
  // Borra dependencias típicas (si alguna tabla no existe, no rompe)
  await prisma.promocion.deleteMany({ where: { negocioId: { in: ids } } }).catch(() => {});
  await prisma.resena.deleteMany({ where: { negocioId: { in: ids } } }).catch(() => {});
  await prisma.reserva.deleteMany({ where: { negocioId: { in: ids } } }).catch(() => {});
  await prisma.producto.deleteMany({ where: { negocioId: { in: ids } } }).catch(() => {});

  // Finalmente, borra los negocios
  const deleted = await prisma.negocio.deleteMany({ where: { id: { in: ids } } });
  console.log('OK. Negocios borrados:', ids.join(', '), '=>', deleted.count);
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
