ALTER TABLE "Resena"
DROP CONSTRAINT IF EXISTS "Resena_productoId_fkey";

DROP INDEX IF EXISTS "Resena_productoId_idx";

ALTER TABLE "Resena"
DROP COLUMN IF EXISTS "productoId",
DROP COLUMN IF EXISTS "productoPrecio";
