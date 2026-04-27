/*
  Warnings:

  - A unique constraint covering the columns `[negocioId,recursoId,fecha]` on the table `Reserva` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CanalVenta" AS ENUM ('WEB', 'APP', 'PRESENCIAL', 'TELEFONO', 'OTRO');

-- DropIndex
DROP INDEX "Reserva_negocioId_fecha_key";

-- AlterTable
ALTER TABLE "Compra" ADD COLUMN     "moneda" TEXT NOT NULL DEFAULT 'EUR';

-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "moneda" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "refExterna" TEXT;

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "canalVenta" "CanalVenta" NOT NULL DEFAULT 'WEB',
ADD COLUMN     "totalSnapshot" DECIMAL(10,2),
ADD COLUMN     "usuarioId" INTEGER;

-- AlterTable
ALTER TABLE "PedidoProducto" ADD COLUMN     "categoriaIdSnapshot" INTEGER;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "codigoSKU" TEXT,
ADD COLUMN     "stockDisponible" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockReservado" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "recursoId" INTEGER;

-- CreateTable
CREATE TABLE "RecursoReserva" (
    "id" SERIAL NOT NULL,
    "negocioId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "capacidad" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "RecursoReserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitaNegocio" (
    "id" SERIAL NOT NULL,
    "negocioId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "origen" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitaNegocio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecursoReserva_negocioId_idx" ON "RecursoReserva"("negocioId");

-- CreateIndex
CREATE INDEX "RecursoReserva_activo_idx" ON "RecursoReserva"("activo");

-- CreateIndex
CREATE INDEX "VisitaNegocio_negocioId_creadoEn_idx" ON "VisitaNegocio"("negocioId", "creadoEn");

-- CreateIndex
CREATE INDEX "VisitaNegocio_usuarioId_idx" ON "VisitaNegocio"("usuarioId");

-- CreateIndex
CREATE INDEX "VisitaNegocio_origen_idx" ON "VisitaNegocio"("origen");

-- CreateIndex
CREATE INDEX "Compra_moneda_idx" ON "Compra"("moneda");

-- CreateIndex
CREATE INDEX "Pago_refExterna_idx" ON "Pago"("refExterna");

-- CreateIndex
CREATE INDEX "Pedido_usuarioId_idx" ON "Pedido"("usuarioId");

-- CreateIndex
CREATE INDEX "Pedido_canalVenta_idx" ON "Pedido"("canalVenta");

-- CreateIndex
CREATE INDEX "PedidoProducto_categoriaIdSnapshot_idx" ON "PedidoProducto"("categoriaIdSnapshot");

-- CreateIndex
CREATE INDEX "Producto_codigoSKU_idx" ON "Producto"("codigoSKU");

-- CreateIndex
CREATE INDEX "Reserva_recursoId_idx" ON "Reserva"("recursoId");

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_negocioId_recursoId_fecha_key" ON "Reserva"("negocioId", "recursoId", "fecha");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecursoReserva" ADD CONSTRAINT "RecursoReserva_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "RecursoReserva"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaNegocio" ADD CONSTRAINT "VisitaNegocio_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaNegocio" ADD CONSTRAINT "VisitaNegocio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
