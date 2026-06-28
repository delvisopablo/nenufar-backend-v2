-- DropIndex: se reemplaza el link público vivo por códigos de compartición (snapshot fijo)
DROP INDEX "ListaCompra_publica_idx";

-- DropIndex
DROP INDEX "ListaCompra_shareToken_idx";

-- DropIndex
DROP INDEX "ListaCompra_shareToken_key";

-- AlterTable
ALTER TABLE "ListaCompra"
DROP COLUMN "publica",
DROP COLUMN "shareToken";

-- AlterTable: histórico de pedidos generados al cerrar una Nenulista
ALTER TABLE "Pedido"
ADD COLUMN "listaCompraId" INTEGER,
ADD COLUMN "listaCompraSnapshot" JSONB;

-- CreateIndex
CREATE INDEX "Pedido_listaCompraId_idx"
ON "Pedido"("listaCompraId");

-- AddForeignKey
ALTER TABLE "Pedido"
ADD CONSTRAINT "Pedido_listaCompraId_fkey"
FOREIGN KEY ("listaCompraId") REFERENCES "ListaCompra"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- CreateTable: códigos para compartir/importar una Nenulista como copia independiente
CREATE TABLE "ListaCompraCodigo" (
  "id" SERIAL NOT NULL,
  "codigo" TEXT NOT NULL,
  "listaCompraId" INTEGER,
  "usuarioOrigenId" INTEGER NOT NULL,
  "nombreSnapshot" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usadoVeces" INTEGER NOT NULL DEFAULT 0,
  "activo" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "ListaCompraCodigo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListaCompraCodigo_codigo_key"
ON "ListaCompraCodigo"("codigo");

-- CreateIndex
CREATE INDEX "ListaCompraCodigo_codigo_idx"
ON "ListaCompraCodigo"("codigo");

-- CreateIndex
CREATE INDEX "ListaCompraCodigo_usuarioOrigenId_idx"
ON "ListaCompraCodigo"("usuarioOrigenId");

-- CreateIndex
CREATE INDEX "ListaCompraCodigo_activo_idx"
ON "ListaCompraCodigo"("activo");

-- AddForeignKey
ALTER TABLE "ListaCompraCodigo"
ADD CONSTRAINT "ListaCompraCodigo_usuarioOrigenId_fkey"
FOREIGN KEY ("usuarioOrigenId") REFERENCES "Usuario"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaCompraCodigo"
ADD CONSTRAINT "ListaCompraCodigo_listaCompraId_fkey"
FOREIGN KEY ("listaCompraId") REFERENCES "ListaCompra"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
