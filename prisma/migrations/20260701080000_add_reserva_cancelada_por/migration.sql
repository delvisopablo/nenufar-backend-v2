-- CreateEnum
CREATE TYPE "public"."ReservaCanceladaPor" AS ENUM ('USUARIO', 'NEGOCIO');

-- AlterTable
ALTER TABLE "public"."Reserva" ADD COLUMN "canceladaPor" "public"."ReservaCanceladaPor";
