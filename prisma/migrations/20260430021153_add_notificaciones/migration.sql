-- 1) Enum NotificacionTipo
DO $$ BEGIN
  CREATE TYPE "NotificacionTipo" AS ENUM ('PROMOCION','POST','NEGOCIO','RESENA','SISTEMA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2) Tabla Notificacion
CREATE TABLE IF NOT EXISTS "Notificacion" (
  "id" SERIAL PRIMARY KEY,
  "usuarioId" INTEGER NOT NULL,
  "tipo" "NotificacionTipo" NOT NULL,
  "titulo" TEXT NOT NULL,
  "contenido" TEXT,
  "link" TEXT,
  "leida" BOOLEAN NOT NULL DEFAULT false,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leidaEn" TIMESTAMP(3),
  "negocioId" INTEGER,
  "promocionId" INTEGER,
  "postId" INTEGER,
  CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE,
  CONSTRAINT "Notificacion_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE SET NULL,
  CONSTRAINT "Notificacion_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "Promocion"("id") ON DELETE SET NULL,
  CONSTRAINT "Notificacion_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "Notificacion_usuarioId_leida_idx" ON "Notificacion"("usuarioId","leida");
CREATE INDEX IF NOT EXISTS "Notificacion_usuarioId_creadoEn_idx" ON "Notificacion"("usuarioId","creadoEn");
CREATE INDEX IF NOT EXISTS "Notificacion_negocioId_idx" ON "Notificacion"("negocioId");

-- 3) Flag en NegocioSeguimiento
ALTER TABLE "NegocioSeguimiento"
  ADD COLUMN IF NOT EXISTS "notificacionesActivas" BOOLEAN NOT NULL DEFAULT true;
