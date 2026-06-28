-- CreateTable: progreso de logros propios de negocio
CREATE TABLE "LogroNegocio" (
  "id" SERIAL NOT NULL,
  "logroId" INTEGER NOT NULL,
  "negocioId" INTEGER NOT NULL,
  "progreso" INTEGER NOT NULL DEFAULT 0,
  "veces" INTEGER NOT NULL DEFAULT 0,
  "conseguido" BOOLEAN NOT NULL DEFAULT false,
  "conseguidoEn" TIMESTAMP(3),
  "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LogroNegocio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LogroNegocio_logroId_negocioId_key"
ON "LogroNegocio"("logroId", "negocioId");

-- CreateIndex
CREATE INDEX "LogroNegocio_negocioId_idx"
ON "LogroNegocio"("negocioId");

-- CreateIndex
CREATE INDEX "LogroNegocio_conseguido_idx"
ON "LogroNegocio"("conseguido");

-- AddForeignKey
ALTER TABLE "LogroNegocio"
ADD CONSTRAINT "LogroNegocio_logroId_fkey"
FOREIGN KEY ("logroId") REFERENCES "Logro"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogroNegocio"
ADD CONSTRAINT "LogroNegocio_negocioId_fkey"
FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- CreateTable: logros destacados en el perfil de usuario
CREATE TABLE "UsuarioLogroDestacado" (
  "id" SERIAL NOT NULL,
  "usuarioId" INTEGER NOT NULL,
  "logroId" INTEGER NOT NULL,
  "posicion" INTEGER NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UsuarioLogroDestacado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioLogroDestacado_usuarioId_posicion_key"
ON "UsuarioLogroDestacado"("usuarioId", "posicion");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioLogroDestacado_usuarioId_logroId_key"
ON "UsuarioLogroDestacado"("usuarioId", "logroId");

-- CreateIndex
CREATE INDEX "UsuarioLogroDestacado_usuarioId_idx"
ON "UsuarioLogroDestacado"("usuarioId");

-- AddForeignKey
ALTER TABLE "UsuarioLogroDestacado"
ADD CONSTRAINT "UsuarioLogroDestacado_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioLogroDestacado"
ADD CONSTRAINT "UsuarioLogroDestacado_logroId_fkey"
FOREIGN KEY ("logroId") REFERENCES "Logro"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
