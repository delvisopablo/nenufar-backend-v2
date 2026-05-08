CREATE TABLE "AdminLog" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" INTEGER,
    "motivo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminLog_adminId_creadoEn_idx" ON "AdminLog"("adminId", "creadoEn");
CREATE INDEX "AdminLog_entidad_entidadId_idx" ON "AdminLog"("entidad", "entidadId");
CREATE INDEX "AdminLog_accion_creadoEn_idx" ON "AdminLog"("accion", "creadoEn");

ALTER TABLE "AdminLog"
ADD CONSTRAINT "AdminLog_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "Usuario"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
