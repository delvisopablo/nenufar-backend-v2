-- AlterTable
ALTER TABLE "public"."Compra"
ADD COLUMN "negocioId" INTEGER;

-- Backfill
UPDATE "public"."Compra" AS c
SET "negocioId" = p."negocioId"
FROM "public"."Pedido" AS p
WHERE c."pedidoId" = p."id";

-- AlterTable
ALTER TABLE "public"."Compra"
ALTER COLUMN "negocioId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Compra_negocioId_idx" ON "public"."Compra"("negocioId");

-- AddForeignKey
ALTER TABLE "public"."Compra"
ADD CONSTRAINT "Compra_negocioId_fkey"
FOREIGN KEY ("negocioId") REFERENCES "public"."Negocio"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
