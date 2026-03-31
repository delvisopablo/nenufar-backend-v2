import { PrismaClient } from '@prisma/client';
import { applyTestDatabaseUrl } from '../prisma/test-environment';

export default async function globalTeardown() {
  applyTestDatabaseUrl();

  const prisma = new PrismaClient();
  await prisma.$connect();

  const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename ASC
  `);

  const summary = await Promise.all(
    tables.map(async ({ tablename }) => {
      const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
        `SELECT COUNT(*)::int AS count FROM "public"."${tablename}"`,
      );

      return {
        tabla: tablename,
        registros: Number(rows[0]?.count ?? 0),
      };
    }),
  );

  console.log('\nE2E leak summary');
  console.table(summary.filter((row) => row.registros > 0));

  await prisma.$disconnect();
}
