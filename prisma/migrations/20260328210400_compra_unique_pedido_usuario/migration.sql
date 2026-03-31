DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."Compra"
    GROUP BY "pedidoId", "usuarioId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot add Compra_pedidoId_usuarioId_key because duplicate compras already exist';
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "Compra_pedidoId_usuarioId_key"
ON "public"."Compra"("pedidoId", "usuarioId");
