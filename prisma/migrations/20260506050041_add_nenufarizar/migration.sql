-- AlterEnum
ALTER TYPE "MotivoTx" ADD VALUE 'REFERIDO';

-- AlterEnum
ALTER TYPE "NotificacionTipo" ADD VALUE 'REFERIDO';

-- DropForeignKey
ALTER TABLE "Notificacion" DROP CONSTRAINT "Notificacion_negocioId_fkey";

-- DropForeignKey
ALTER TABLE "Notificacion" DROP CONSTRAINT "Notificacion_postId_fkey";

-- DropForeignKey
ALTER TABLE "Notificacion" DROP CONSTRAINT "Notificacion_promocionId_fkey";

-- DropForeignKey
ALTER TABLE "Notificacion" DROP CONSTRAINT "Notificacion_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "codigoReferido" TEXT,
ADD COLUMN     "referidoPorId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_codigoReferido_key" ON "Usuario"("codigoReferido");

-- CreateIndex
CREATE INDEX "Usuario_codigoReferido_idx" ON "Usuario"("codigoReferido");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_referidoPorId_fkey" FOREIGN KEY ("referidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "Promocion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

