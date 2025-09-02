-- DropIndex
DROP INDEX "public"."user_followed_spotify_ids_gin";

-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "eventId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_eventId_idx" ON "public"."Notification"("eventId");

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
