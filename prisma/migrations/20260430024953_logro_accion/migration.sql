ALTER TABLE "Logro" ADD COLUMN IF NOT EXISTS "accion" TEXT;
CREATE INDEX IF NOT EXISTS "Logro_accion_idx" ON "Logro"("accion");
