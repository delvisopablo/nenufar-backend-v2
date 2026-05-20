-- Extend achievement metadata without renaming existing columns.
CREATE TYPE "public"."LogroCategoria" AS ENUM (
  'GENERAL',
  'EXPLORACION',
  'RESENAS',
  'COMPRAS',
  'RESERVAS',
  'PROMOCIONES',
  'NEGOCIO',
  'SOCIAL',
  'ESPECIAL'
);

ALTER TABLE "public"."Logro"
ADD COLUMN "categoriaLogro" "public"."LogroCategoria" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "oculto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "esFinal" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."LogroUsuario"
ADD COLUMN "progreso" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Logro_categoriaLogro_idx" ON "public"."Logro"("categoriaLogro");
CREATE INDEX "Logro_oculto_idx" ON "public"."Logro"("oculto");
CREATE INDEX "Logro_esFinal_idx" ON "public"."Logro"("esFinal");
