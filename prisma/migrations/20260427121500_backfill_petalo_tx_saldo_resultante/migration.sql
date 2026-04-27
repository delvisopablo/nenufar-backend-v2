-- Backfill del saldo histórico antes de hacer obligatoria la columna.
-- Se reconstruye el saldo acumulado por usuario respetando el orden temporal.
WITH movimientos AS (
  SELECT
    "id",
    SUM("delta") OVER (
      PARTITION BY "usuarioId"
      ORDER BY "creadoEn", "id"
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS saldo_calculado
  FROM "PetaloTx"
)
UPDATE "PetaloTx" AS pt
SET "saldoResultante" = movimientos.saldo_calculado
FROM movimientos
WHERE pt."id" = movimientos."id"
  AND pt."saldoResultante" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PetaloTx"
    WHERE "saldoResultante" IS NULL
  ) THEN
    RAISE EXCEPTION 'No se pudo rellenar PetaloTx.saldoResultante para todas las filas';
  END IF;
END $$;

ALTER TABLE "PetaloTx"
ALTER COLUMN "saldoResultante" SET NOT NULL;
