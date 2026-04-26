DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'EstadoCuenta'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."EstadoCuenta" AS ENUM (
      'ACTIVA',
      'PENDIENTE_VERIFICACION',
      'SUSPENDIDA',
      'BLOQUEADA',
      'ELIMINADA'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'RolGlobal'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "public"."RolGlobal" AS ENUM (
      'USUARIO',
      'MODERADOR',
      'ADMIN'
    );
  END IF;
END
$$;

ALTER TABLE "public"."Usuario"
  ADD COLUMN IF NOT EXISTS "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "eliminadoEn" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verificadoEn" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ultimoLoginEn" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "estadoCuenta" "public"."EstadoCuenta" NOT NULL DEFAULT 'ACTIVA',
  ADD COLUMN IF NOT EXISTS "rolGlobal" "public"."RolGlobal" NOT NULL DEFAULT 'USUARIO';

CREATE INDEX IF NOT EXISTS "Usuario_estadoCuenta_idx" ON "public"."Usuario"("estadoCuenta");
CREATE INDEX IF NOT EXISTS "Usuario_rolGlobal_idx" ON "public"."Usuario"("rolGlobal");
