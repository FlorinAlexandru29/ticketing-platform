-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "followedSpotifyIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
