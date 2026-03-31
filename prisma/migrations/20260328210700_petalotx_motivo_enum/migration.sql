-- CreateEnum
CREATE TYPE "public"."MotivoTx" AS ENUM (
  'RESENA_AUTOR',
  'RESENA_NEGOCIO',
  'LIKE',
  'LOGRO',
  'RESERVA',
  'OTRO'
);

-- AlterTable
ALTER TABLE "public"."PetaloTx"
ALTER COLUMN "motivo" TYPE "public"."MotivoTx"
USING (
  CASE UPPER("motivo")
    WHEN 'RESENA_AUTOR' THEN 'RESENA_AUTOR'::"public"."MotivoTx"
    WHEN 'RESENA_NEGOCIO' THEN 'RESENA_NEGOCIO'::"public"."MotivoTx"
    WHEN 'LIKE' THEN 'LIKE'::"public"."MotivoTx"
    WHEN 'LOGRO' THEN 'LOGRO'::"public"."MotivoTx"
    WHEN 'RESERVA' THEN 'RESERVA'::"public"."MotivoTx"
    ELSE 'OTRO'::"public"."MotivoTx"
  END
);
