-- CreateEnum
CREATE TYPE "public"."PostTipo" AS ENUM ('RESENA', 'PROMOCION', 'LOGRO');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."Post"
    WHERE (
      (CASE WHEN "resenaId" IS NULL THEN 0 ELSE 1 END) +
      (CASE WHEN "promocionId" IS NULL THEN 0 ELSE 1 END) +
      (CASE WHEN "logroId" IS NULL THEN 0 ELSE 1 END)
    ) <> 1
  ) THEN
    RAISE EXCEPTION
      'Cannot backfill Post.tipo because existing rows do not point to exactly one content record';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "public"."Post"
ADD COLUMN "tipo" "public"."PostTipo";

-- Backfill
UPDATE "public"."Post"
SET "tipo" = CASE
  WHEN "resenaId" IS NOT NULL THEN 'RESENA'::"public"."PostTipo"
  WHEN "promocionId" IS NOT NULL THEN 'PROMOCION'::"public"."PostTipo"
  WHEN "logroId" IS NOT NULL THEN 'LOGRO'::"public"."PostTipo"
  ELSE NULL
END;

-- AlterTable
ALTER TABLE "public"."Post"
ALTER COLUMN "tipo" SET NOT NULL;

-- AddConstraint
ALTER TABLE "public"."Post"
ADD CONSTRAINT "Post_tipo_single_target_chk" CHECK (
  (
    "tipo" = 'RESENA'::"public"."PostTipo" AND
    "resenaId" IS NOT NULL AND
    "promocionId" IS NULL AND
    "logroId" IS NULL
  ) OR (
    "tipo" = 'PROMOCION'::"public"."PostTipo" AND
    "resenaId" IS NULL AND
    "promocionId" IS NOT NULL AND
    "logroId" IS NULL
  ) OR (
    "tipo" = 'LOGRO'::"public"."PostTipo" AND
    "resenaId" IS NULL AND
    "promocionId" IS NULL AND
    "logroId" IS NOT NULL
  )
);
