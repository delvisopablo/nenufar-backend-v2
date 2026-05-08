ALTER TABLE "Negocio"
ADD COLUMN "nenufarActivo" TEXT;

UPDATE "Negocio"
SET "nenufarActivo" = "nenufarAsset"
WHERE "nenufarActivo" IS NULL
  AND "nenufarAsset" IS NOT NULL;
