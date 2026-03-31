-- DropForeignKey
ALTER TABLE "public"."Post" DROP CONSTRAINT "Post_resenaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Post" DROP CONSTRAINT "Post_promocionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Post" DROP CONSTRAINT "Post_logroId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Comentario" DROP CONSTRAINT "Comentario_postId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Like" DROP CONSTRAINT "Like_postId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Post"
ADD CONSTRAINT "Post_resenaId_fkey"
FOREIGN KEY ("resenaId") REFERENCES "public"."Resena"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post"
ADD CONSTRAINT "Post_promocionId_fkey"
FOREIGN KEY ("promocionId") REFERENCES "public"."Promocion"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post"
ADD CONSTRAINT "Post_logroId_fkey"
FOREIGN KEY ("logroId") REFERENCES "public"."Logro"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comentario"
ADD CONSTRAINT "Comentario_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "public"."Post"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Like"
ADD CONSTRAINT "Like_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "public"."Post"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
