-- CreateEnum
CREATE TYPE "ListaTipo" AS ENUM ('FAVORITOS', 'COMPRA', 'CURIOSOS', 'PERSONALIZADA');

-- AlterTable: add new columns for multi-lista + share link support
ALTER TABLE "ListaCompra"
ADD COLUMN "tipo" "ListaTipo" NOT NULL DEFAULT 'PERSONALIZADA',
ADD COLUMN "descripcion" TEXT,
ADD COLUMN "color" TEXT,
ADD COLUMN "iconoNenufar" TEXT,
ADD COLUMN "publica" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "shareToken" TEXT,
ADD COLUMN "eliminadaEn" TIMESTAMP(3);

-- DataMigration: las listas preexistentes (creadas antes de soportar varias
-- listas por usuario) se consideraban listas de la compra por defecto.
UPDATE "ListaCompra" SET "tipo" = 'COMPRA';

-- DropIndex: ya no se limita a una sola lista por usuario
DROP INDEX "ListaCompra_usuarioId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ListaCompra_usuarioId_nombre_key"
ON "ListaCompra"("usuarioId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ListaCompra_shareToken_key"
ON "ListaCompra"("shareToken");

-- CreateIndex
CREATE INDEX "ListaCompra_usuarioId_idx"
ON "ListaCompra"("usuarioId");

-- CreateIndex
CREATE INDEX "ListaCompra_tipo_idx"
ON "ListaCompra"("tipo");

-- CreateIndex
CREATE INDEX "ListaCompra_shareToken_idx"
ON "ListaCompra"("shareToken");

-- CreateIndex
CREATE INDEX "ListaCompra_publica_idx"
ON "ListaCompra"("publica");
