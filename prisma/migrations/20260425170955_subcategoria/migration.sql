/*
  Warnings:

  - You are about to alter the column `total` on the `Compra` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `cantidad` on the `Pago` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `precioUnitario` on the `PedidoProducto` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `precio` on the `Producto` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `descuento` on the `Promocion` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[categoriaId,nombre]` on the table `Subcategoria` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `actualizadoEn` to the `Categoria` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `Comentario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `Compra` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `Logro` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `LogroUsuario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `Negocio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `NegocioMiembro` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `Pago` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `Pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `PedidoProducto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `PedidoProducto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `Producto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `Promocion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `Resena` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `Reserva` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualizadoEn` to the `Subcategoria` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContenidoEstado" AS ENUM ('BORRADOR', 'PUBLICADO', 'OCULTO', 'REPORTADO', 'ELIMINADO');

-- CreateEnum
CREATE TYPE "TipoDescuento" AS ENUM ('PORCENTAJE', 'IMPORTE_FIJO', 'PACK', 'DOS_X_UNO');

-- CreateEnum
CREATE TYPE "ReservaEstado" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA', 'NO_SHOW');

-- DropIndex
DROP INDEX "Resena_negocioId_idx";

-- DropIndex
DROP INDEX "Subcategoria_nombre_key";

-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Comentario" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "estado" "ContenidoEstado" NOT NULL DEFAULT 'PUBLICADO',
ADD COLUMN     "moderadoEn" TIMESTAMP(3),
ADD COLUMN     "motivoModeracion" TEXT;

-- AlterTable
ALTER TABLE "Compra" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "total" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Logro" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "LogroUsuario" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Negocio" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "codigoPostal" TEXT,
ADD COLUMN     "descripcionCorta" TEXT,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "emailContacto" TEXT,
ADD COLUMN     "fotoPerfil" TEXT,
ADD COLUMN     "fotoPortada" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "latitud" DECIMAL(9,6),
ADD COLUMN     "longitud" DECIMAL(9,6),
ADD COLUMN     "provincia" TEXT,
ADD COLUMN     "telefono" TEXT,
ADD COLUMN     "verificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "web" TEXT;

-- AlterTable
ALTER TABLE "NegocioMiembro" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "PedidoProducto" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "descuentoAplicado" DECIMAL(10,2),
ADD COLUMN     "promocionId" INTEGER,
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL,
ALTER COLUMN "precioUnitario" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "PetaloTx" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "saldoResultante" INTEGER;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "estado" "ContenidoEstado" NOT NULL DEFAULT 'PUBLICADO',
ADD COLUMN     "moderadoEn" TIMESTAMP(3),
ADD COLUMN     "motivoModeracion" TEXT;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ALTER COLUMN "precio" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Promocion" ADD COLUMN     "activa" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "estado" "ContenidoEstado" NOT NULL DEFAULT 'PUBLICADO',
ADD COLUMN     "fechaInicio" TIMESTAMP(3),
ADD COLUMN     "moderadoEn" TIMESTAMP(3),
ADD COLUMN     "motivoModeracion" TEXT,
ADD COLUMN     "stockMaximo" INTEGER,
ADD COLUMN     "tipoDescuento" "TipoDescuento" NOT NULL DEFAULT 'PORCENTAJE',
ADD COLUMN     "usosActuales" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usosMaximos" INTEGER,
ALTER COLUMN "descuento" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Resena" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "estado" "ContenidoEstado" NOT NULL DEFAULT 'PUBLICADO',
ADD COLUMN     "moderadoEn" TIMESTAMP(3),
ADD COLUMN     "motivoModeracion" TEXT;

-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "canceladaEn" TIMESTAMP(3),
ADD COLUMN     "duracionMinutos" INTEGER,
ADD COLUMN     "estado" "ReservaEstado" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "motivoCancelacion" TEXT,
ADD COLUMN     "numPersonas" INTEGER;

-- AlterTable
ALTER TABLE "Subcategoria" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Usuario" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- CreateTable
CREATE TABLE "UsuarioSeguimiento" (
    "id" SERIAL NOT NULL,
    "seguidorId" INTEGER NOT NULL,
    "seguidoId" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioSeguimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsuarioSeguimiento_seguidorId_idx" ON "UsuarioSeguimiento"("seguidorId");

-- CreateIndex
CREATE INDEX "UsuarioSeguimiento_seguidoId_idx" ON "UsuarioSeguimiento"("seguidoId");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioSeguimiento_seguidorId_seguidoId_key" ON "UsuarioSeguimiento"("seguidorId", "seguidoId");

-- CreateIndex
CREATE INDEX "Categoria_activo_idx" ON "Categoria"("activo");

-- CreateIndex
CREATE INDEX "Comentario_estado_idx" ON "Comentario"("estado");

-- CreateIndex
CREATE INDEX "Compra_estado_creadoEn_idx" ON "Compra"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "Logro_tipo_idx" ON "Logro"("tipo");

-- CreateIndex
CREATE INDEX "LogroUsuario_conseguido_idx" ON "LogroUsuario"("conseguido");

-- CreateIndex
CREATE INDEX "Negocio_ciudad_idx" ON "Negocio"("ciudad");

-- CreateIndex
CREATE INDEX "Negocio_activo_idx" ON "Negocio"("activo");

-- CreateIndex
CREATE INDEX "Negocio_verificado_idx" ON "Negocio"("verificado");

-- CreateIndex
CREATE INDEX "Pago_estado_creadoEn_idx" ON "Pago"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "Pedido_estado_creadoEn_idx" ON "Pedido"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "PedidoProducto_promocionId_idx" ON "PedidoProducto"("promocionId");

-- CreateIndex
CREATE INDEX "PetaloTx_usuarioId_motivo_creadoEn_idx" ON "PetaloTx"("usuarioId", "motivo", "creadoEn");

-- CreateIndex
CREATE INDEX "Post_tipo_creadoEn_idx" ON "Post"("tipo", "creadoEn");

-- CreateIndex
CREATE INDEX "Post_estado_idx" ON "Post"("estado");

-- CreateIndex
CREATE INDEX "Producto_activo_idx" ON "Producto"("activo");

-- CreateIndex
CREATE INDEX "Promocion_negocioId_fechaCaducidad_idx" ON "Promocion"("negocioId", "fechaCaducidad");

-- CreateIndex
CREATE INDEX "Promocion_codigo_idx" ON "Promocion"("codigo");

-- CreateIndex
CREATE INDEX "Promocion_estado_idx" ON "Promocion"("estado");

-- CreateIndex
CREATE INDEX "Promocion_activa_idx" ON "Promocion"("activa");

-- CreateIndex
CREATE INDEX "Resena_negocioId_creadoEn_idx" ON "Resena"("negocioId", "creadoEn");

-- CreateIndex
CREATE INDEX "Resena_estado_idx" ON "Resena"("estado");

-- CreateIndex
CREATE INDEX "Reserva_estado_idx" ON "Reserva"("estado");

-- CreateIndex
CREATE INDEX "Subcategoria_categoriaId_idx" ON "Subcategoria"("categoriaId");

-- CreateIndex
CREATE INDEX "Subcategoria_nombre_idx" ON "Subcategoria"("nombre");

-- CreateIndex
CREATE INDEX "Subcategoria_activo_idx" ON "Subcategoria"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategoria_categoriaId_nombre_key" ON "Subcategoria"("categoriaId", "nombre");

-- CreateIndex
CREATE INDEX "Usuario_creadoEn_idx" ON "Usuario"("creadoEn");

-- AddForeignKey
ALTER TABLE "PedidoProducto" ADD CONSTRAINT "PedidoProducto_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "Promocion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioSeguimiento" ADD CONSTRAINT "UsuarioSeguimiento_seguidorId_fkey" FOREIGN KEY ("seguidorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioSeguimiento" ADD CONSTRAINT "UsuarioSeguimiento_seguidoId_fkey" FOREIGN KEY ("seguidoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
