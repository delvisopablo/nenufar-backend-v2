import { PrismaClient } from '@prisma/client';
import { generateUniqueNegocioSlug } from '../../src/negocio/negocio-slug.util';

const prisma = new PrismaClient();

async function main() {
  const negocios = await prisma.negocio.findMany({
    where: {
      OR: [{ slug: null }, { slug: '' }],
    },
    select: {
      id: true,
      nombre: true,
    },
    orderBy: { id: 'asc' },
  });

  for (const negocio of negocios) {
    const slug = await generateUniqueNegocioSlug(prisma, negocio.nombre);

    await prisma.negocio.update({
      where: { id: negocio.id },
      data: { slug },
    });

    console.log(`Negocio ${negocio.id} -> ${slug}`);
  }

  console.log(`Backfill completado. ${negocios.length} negocios actualizados.`);
}

main()
  .catch((error) => {
    console.error('Error generando slugs de negocio:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
