-- AlterTable
ALTER TABLE "public"."Usuario" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "public"."Usuario" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);
ALTER TABLE "public"."Usuario" ADD COLUMN "passwordResetUsedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Usuario_passwordResetTokenHash_idx" ON "public"."Usuario"("passwordResetTokenHash");
