-- Phase 8: downloadable CV per language (site settings) and an optional location per experience.
-- Additive only: four nullable columns, no defaults, no backfill. Both foreign keys follow the
-- media convention (storage path -> MediaFile.path, RESTRICT on delete, CASCADE on rename).
-- Rollback: drop the two constraints, then the four columns.

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "locationEn" TEXT,
ADD COLUMN     "locationTr" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "cvPathEn" TEXT,
ADD COLUMN     "cvPathTr" TEXT;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_cvPathTr_fkey" FOREIGN KEY ("cvPathTr") REFERENCES "MediaFile"("path") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_cvPathEn_fkey" FOREIGN KEY ("cvPathEn") REFERENCES "MediaFile"("path") ON DELETE RESTRICT ON UPDATE CASCADE;
