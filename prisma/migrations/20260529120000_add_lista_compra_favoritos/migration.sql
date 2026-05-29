CREATE TABLE "ProductoFavorito" (
  "id" SERIAL NOT NULL,
  "usuarioId" INTEGER NOT NULL,
  "productoId" INTEGER NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductoFavorito_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductoFavorito_usuarioId_productoId_key"
ON "ProductoFavorito"("usuarioId", "productoId");

CREATE INDEX "ProductoFavorito_productoId_idx"
ON "ProductoFavorito"("productoId");

CREATE TABLE "ListaCompra" (
  "id" SERIAL NOT NULL,
  "usuarioId" INTEGER NOT NULL,
  "nombre" TEXT NOT NULL DEFAULT 'Mi lista de la compra',
  "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ListaCompra_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListaCompra_usuarioId_key"
ON "ListaCompra"("usuarioId");

CREATE TABLE "ListaCompraItem" (
  "id" SERIAL NOT NULL,
  "listaCompraId" INTEGER NOT NULL,
  "productoId" INTEGER,
  "nombreManual" TEXT,
  "cantidad" INTEGER NOT NULL DEFAULT 1,
  "completado" BOOLEAN NOT NULL DEFAULT false,
  "nota" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ListaCompraItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListaCompraItem_listaCompraId_productoId_key"
ON "ListaCompraItem"("listaCompraId", "productoId");

CREATE INDEX "ListaCompraItem_listaCompraId_idx"
ON "ListaCompraItem"("listaCompraId");

CREATE INDEX "ListaCompraItem_productoId_idx"
ON "ListaCompraItem"("productoId");

CREATE INDEX "ListaCompraItem_completado_idx"
ON "ListaCompraItem"("completado");

ALTER TABLE "ProductoFavorito"
ADD CONSTRAINT "ProductoFavorito_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ProductoFavorito"
ADD CONSTRAINT "ProductoFavorito_productoId_fkey"
FOREIGN KEY ("productoId") REFERENCES "Producto"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ListaCompra"
ADD CONSTRAINT "ListaCompra_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ListaCompraItem"
ADD CONSTRAINT "ListaCompraItem_listaCompraId_fkey"
FOREIGN KEY ("listaCompraId") REFERENCES "ListaCompra"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ListaCompraItem"
ADD CONSTRAINT "ListaCompraItem_productoId_fkey"
FOREIGN KEY ("productoId") REFERENCES "Producto"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
