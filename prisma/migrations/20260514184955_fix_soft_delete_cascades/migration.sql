-- AlterEnum
ALTER TYPE "NotificacionTipo" ADD VALUE 'RESERVA';

-- DropForeignKey
ALTER TABLE "NegocioSeguimiento" DROP CONSTRAINT "NegocioSeguimiento_negocioId_fkey";

-- DropForeignKey
ALTER TABLE "NegocioSeguimiento" DROP CONSTRAINT "NegocioSeguimiento_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Notificacion" DROP CONSTRAINT "Notificacion_usuarioId_fkey";

-- AlterTable
ALTER TABLE "SolicitudProductoCatalogo" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Negocio_reservasActivas_idx" ON "Negocio"("reservasActivas");

-- CreateIndex
CREATE INDEX "Notificacion_postId_idx" ON "Notificacion"("postId");

-- CreateIndex
CREATE INDEX "Notificacion_promocionId_idx" ON "Notificacion"("promocionId");

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegocioSeguimiento" ADD CONSTRAINT "NegocioSeguimiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegocioSeguimiento" ADD CONSTRAINT "NegocioSeguimiento_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
