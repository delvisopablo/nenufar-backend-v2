-- CreateEnum
CREATE TYPE "public"."LikeTipo" AS ENUM ('LIKE');

-- AlterTable
ALTER TABLE "public"."Like"
ALTER COLUMN "tipo" DROP DEFAULT,
ALTER COLUMN "tipo" TYPE "public"."LikeTipo"
USING 'LIKE'::"public"."LikeTipo",
ALTER COLUMN "tipo" SET DEFAULT 'LIKE';
