/*
  Warnings:

  - You are about to drop the column `venue` on the `Event` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[normalized,date,venueName,city]` on the table `Event` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventType` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `venueName` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('CONCERT', 'FESTIVAL');

-- DropIndex
DROP INDEX "public"."Event_normalized_date_venue_city_key";

-- AlterTable
ALTER TABLE "public"."Event" DROP COLUMN "venue",
ADD COLUMN     "country" TEXT,
ADD COLUMN     "countryCode" VARCHAR(2),
ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "eventType" "public"."EventType" NOT NULL,
ADD COLUMN     "posterUrl" TEXT,
ADD COLUMN     "venueId" TEXT,
ADD COLUMN     "venueName" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."Venue" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT,
    "countryCode" VARCHAR(2),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Artist" (
    "id" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genres" TEXT[],
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventArtist" (
    "eventId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "slot" TIMESTAMP(3) NOT NULL,
    "order" INTEGER,

    CONSTRAINT "EventArtist_pkey" PRIMARY KEY ("eventId","artistId")
);

-- CreateTable
CREATE TABLE "public"."TicketTier" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "TicketTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venue_placeId_key" ON "public"."Venue"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_spotifyId_key" ON "public"."Artist"("spotifyId");

-- CreateIndex
CREATE INDEX "EventArtist_artistId_idx" ON "public"."EventArtist"("artistId");

-- CreateIndex
CREATE INDEX "EventArtist_slot_idx" ON "public"."EventArtist"("slot");

-- CreateIndex
CREATE INDEX "TicketTier_eventId_idx" ON "public"."TicketTier"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_normalized_date_venueName_city_key" ON "public"."Event"("normalized", "date", "venueName", "city");

-- AddForeignKey
ALTER TABLE "public"."EventArtist" ADD CONSTRAINT "EventArtist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventArtist" ADD CONSTRAINT "EventArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketTier" ADD CONSTRAINT "TicketTier_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
