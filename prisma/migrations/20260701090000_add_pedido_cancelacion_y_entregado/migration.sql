-- AlterEnum
ALTER TYPE "public"."PedidoEstado" ADD VALUE 'ENTREGADO';

-- CreateEnum
CREATE TYPE "public"."PedidoCanceladoPor" AS ENUM ('USUARIO', 'NEGOCIO');

-- AlterTable
ALTER TABLE "public"."Pedido" ADD COLUMN "motivoCancelacion" TEXT;
ALTER TABLE "public"."Pedido" ADD COLUMN "canceladoEn" TIMESTAMP(3);
ALTER TABLE "public"."Pedido" ADD COLUMN "canceladoPor" "public"."PedidoCanceladoPor";
