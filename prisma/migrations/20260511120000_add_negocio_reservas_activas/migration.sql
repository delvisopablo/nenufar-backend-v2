ALTER TABLE "Negocio"
ADD COLUMN "reservasActivas" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Negocio"
SET "reservasActivas" = true
WHERE "horario" IS NOT NULL
  AND "intervaloReserva" IS NOT NULL
  AND "intervaloReserva" > 0;
