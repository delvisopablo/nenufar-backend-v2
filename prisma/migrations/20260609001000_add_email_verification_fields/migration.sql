ALTER TABLE "Usuario"
ADD COLUMN "codigoVerificacionEmailHash" TEXT,
ADD COLUMN "codigoVerificacionEmailExpiraEn" TIMESTAMP(3),
ADD COLUMN "codigoVerificacionEmailIntentos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "codigoVerificacionEmailUltimoEnvioEn" TIMESTAMP(3);
