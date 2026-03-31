-- CreateEnum
CREATE TYPE "public"."RolNegocio" AS ENUM ('DUENO', 'EMPLEADO');

-- CreateTable
CREATE TABLE "public"."NegocioMiembro" (
  "id" SERIAL NOT NULL,
  "negocioId" INTEGER NOT NULL,
  "usuarioId" INTEGER NOT NULL,
  "rol" "public"."RolNegocio" NOT NULL DEFAULT 'EMPLEADO',

  CONSTRAINT "NegocioMiembro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NegocioMiembro_negocioId_idx"
ON "public"."NegocioMiembro"("negocioId");

-- CreateIndex
CREATE INDEX "NegocioMiembro_usuarioId_idx"
ON "public"."NegocioMiembro"("usuarioId");

-- CreateIndex
CREATE INDEX "NegocioMiembro_rol_idx"
ON "public"."NegocioMiembro"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "NegocioMiembro_negocioId_usuarioId_key"
ON "public"."NegocioMiembro"("negocioId", "usuarioId");

-- AddForeignKey
ALTER TABLE "public"."NegocioMiembro"
ADD CONSTRAINT "NegocioMiembro_negocioId_fkey"
FOREIGN KEY ("negocioId") REFERENCES "public"."Negocio"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NegocioMiembro"
ADD CONSTRAINT "NegocioMiembro_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill
INSERT INTO "public"."NegocioMiembro" ("negocioId", "usuarioId", "rol")
SELECT "id", "duenoId", 'DUENO'::"public"."RolNegocio"
FROM "public"."Negocio"
ON CONFLICT ("negocioId", "usuarioId")
DO UPDATE SET "rol" = EXCLUDED."rol";
