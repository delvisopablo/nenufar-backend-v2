-- AlterTable
ALTER TABLE "public"."Pago"
ADD COLUMN "usuarioId" INTEGER;

-- Backfill
UPDATE "public"."Pago" AS p
SET "usuarioId" = c."usuarioId"
FROM "public"."Compra" AS c
WHERE p."compraId" = c."id";

-- AlterTable
ALTER TABLE "public"."Pago"
ALTER COLUMN "usuarioId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Pago_usuarioId_idx" ON "public"."Pago"("usuarioId");

-- AddForeignKey
ALTER TABLE "public"."Pago"
ADD CONSTRAINT "Pago_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
