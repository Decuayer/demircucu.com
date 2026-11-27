-- Phase 8 home page: a short intro under the name (site settings, per language) and an admin
-- choice of featured skills. Additive: two nullable text columns and one boolean with a constant
-- default (metadata-only in PostgreSQL 11+, no table rewrite); no backfill.
-- Rollback: drop the three columns.

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "heroIntroEn" TEXT,
ADD COLUMN     "heroIntroTr" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;
