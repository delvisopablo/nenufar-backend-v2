DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."Reserva"
    GROUP BY "negocioId", "fecha"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot add Reserva_negocioId_fecha_key because duplicate reservation slots already exist';
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_negocioId_fecha_key"
ON "public"."Reserva"("negocioId", "fecha");
