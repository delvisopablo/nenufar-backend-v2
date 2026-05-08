ALTER TABLE "Producto"
ALTER COLUMN "precio" DROP NOT NULL;

ALTER TABLE "Resena"
ADD COLUMN "productoId" INTEGER,
ADD COLUMN "productoPrecio" DECIMAL(10,2);

CREATE INDEX "Resena_productoId_idx" ON "Resena"("productoId");

ALTER TABLE "Resena"
ADD CONSTRAINT "Resena_productoId_fkey"
FOREIGN KEY ("productoId") REFERENCES "Producto"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
