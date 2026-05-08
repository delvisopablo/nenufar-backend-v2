-- CreateTable
CREATE TABLE "CodigoNenufarizacion" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usadoEn" TIMESTAMP(3),

    CONSTRAINT "CodigoNenufarizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodigoNenufarizacion_codigo_key" ON "CodigoNenufarizacion"("codigo");

-- CreateIndex
CREATE INDEX "CodigoNenufarizacion_activo_usado_idx" ON "CodigoNenufarizacion"("activo", "usado");
