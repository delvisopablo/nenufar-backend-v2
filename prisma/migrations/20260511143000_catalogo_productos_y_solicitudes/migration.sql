CREATE TYPE "EstadoSolicitudProducto" AS ENUM (
  'PENDIENTE',
  'APROBADA',
  'RECHAZADA'
);

ALTER TABLE "Producto"
ADD COLUMN "foto" TEXT,
ADD COLUMN "codigoProducto" TEXT;

UPDATE "Producto"
SET "codigoProducto" = 'PROD-' || LPAD("id"::text, 6, '0')
WHERE "codigoProducto" IS NULL;

CREATE UNIQUE INDEX "Producto_codigoProducto_key"
ON "Producto"("codigoProducto");

CREATE INDEX "Producto_codigoProducto_idx"
ON "Producto"("codigoProducto");

CREATE TABLE "ResenaProducto" (
  "id" SERIAL NOT NULL,
  "resenaId" INTEGER NOT NULL,
  "productoId" INTEGER NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ResenaProducto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResenaProducto_resenaId_productoId_key"
ON "ResenaProducto"("resenaId", "productoId");

CREATE INDEX "ResenaProducto_resenaId_idx"
ON "ResenaProducto"("resenaId");

CREATE INDEX "ResenaProducto_productoId_idx"
ON "ResenaProducto"("productoId");

ALTER TABLE "ResenaProducto"
ADD CONSTRAINT "ResenaProducto_resenaId_fkey"
FOREIGN KEY ("resenaId") REFERENCES "Resena"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ResenaProducto"
ADD CONSTRAINT "ResenaProducto_productoId_fkey"
FOREIGN KEY ("productoId") REFERENCES "Producto"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

CREATE TABLE "SolicitudProductoCatalogo" (
  "id" SERIAL NOT NULL,
  "negocioId" INTEGER NOT NULL,
  "usuarioId" INTEGER NOT NULL,
  "resenaId" INTEGER,
  "productoId" INTEGER,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "precioSugerido" DECIMAL(10,2),
  "estado" "EstadoSolicitudProducto" NOT NULL DEFAULT 'PENDIENTE',
  "motivoRechazo" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SolicitudProductoCatalogo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SolicitudProductoCatalogo_negocioId_estado_creadoEn_idx"
ON "SolicitudProductoCatalogo"("negocioId", "estado", "creadoEn");

CREATE INDEX "SolicitudProductoCatalogo_usuarioId_creadoEn_idx"
ON "SolicitudProductoCatalogo"("usuarioId", "creadoEn");

CREATE INDEX "SolicitudProductoCatalogo_resenaId_idx"
ON "SolicitudProductoCatalogo"("resenaId");

CREATE INDEX "SolicitudProductoCatalogo_productoId_idx"
ON "SolicitudProductoCatalogo"("productoId");

ALTER TABLE "SolicitudProductoCatalogo"
ADD CONSTRAINT "SolicitudProductoCatalogo_negocioId_fkey"
FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "SolicitudProductoCatalogo"
ADD CONSTRAINT "SolicitudProductoCatalogo_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "SolicitudProductoCatalogo"
ADD CONSTRAINT "SolicitudProductoCatalogo_resenaId_fkey"
FOREIGN KEY ("resenaId") REFERENCES "Resena"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "SolicitudProductoCatalogo"
ADD CONSTRAINT "SolicitudProductoCatalogo_productoId_fkey"
FOREIGN KEY ("productoId") REFERENCES "Producto"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
