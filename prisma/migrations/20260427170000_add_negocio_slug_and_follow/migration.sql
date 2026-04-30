-- Add slug to negocios for friendly URLs.
ALTER TABLE "Negocio"
ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "Negocio_slug_key" ON "Negocio"("slug");
CREATE INDEX "Negocio_slug_idx" ON "Negocio"("slug");

-- Allow users to follow businesses.
CREATE TABLE "NegocioSeguimiento" (
  "id" SERIAL NOT NULL,
  "usuarioId" INTEGER NOT NULL,
  "negocioId" INTEGER NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NegocioSeguimiento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NegocioSeguimiento_usuarioId_negocioId_key"
ON "NegocioSeguimiento"("usuarioId", "negocioId");

CREATE INDEX "NegocioSeguimiento_usuarioId_idx"
ON "NegocioSeguimiento"("usuarioId");

CREATE INDEX "NegocioSeguimiento_negocioId_idx"
ON "NegocioSeguimiento"("negocioId");

ALTER TABLE "NegocioSeguimiento"
ADD CONSTRAINT "NegocioSeguimiento_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NegocioSeguimiento"
ADD CONSTRAINT "NegocioSeguimiento_negocioId_fkey"
FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
