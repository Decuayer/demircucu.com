-- Phase 3, contract step. Runs after the release that reads only the new columns is live
-- (that release no longer selects these columns, so dropping them cannot break it).
--
--   1. Attachments: drop the legacy "url" key from items that have a storage "path".
--   2. Drop the backfill helper function.
--   3. Drop the legacy columns and the implicit tag tables (data was copied by
--      20261124120000_phase3_expand). The one external experience logo is dropped on purpose.

UPDATE "Project" SET "files" = (
  SELECT jsonb_agg(CASE WHEN t.elem ? 'path' THEN t.elem - 'url' ELSE t.elem END ORDER BY t.ord)
  FROM jsonb_array_elements("files") WITH ORDINALITY AS t(elem, ord))
WHERE jsonb_typeof("files") = 'array' AND jsonb_array_length("files") > 0;

UPDATE "Experience" SET "files" = (
  SELECT jsonb_agg(CASE WHEN t.elem ? 'path' THEN t.elem - 'url' ELSE t.elem END ORDER BY t.ord)
  FROM jsonb_array_elements("files") WITH ORDINALITY AS t(elem, ord))
WHERE jsonb_typeof("files") = 'array' AND jsonb_array_length("files") > 0;

UPDATE "BlogPost" SET "files" = (
  SELECT jsonb_agg(CASE WHEN t.elem ? 'path' THEN t.elem - 'url' ELSE t.elem END ORDER BY t.ord)
  FROM jsonb_array_elements("files") WITH ORDINALITY AS t(elem, ord))
WHERE jsonb_typeof("files") = 'array' AND jsonb_array_length("files") > 0;

DROP FUNCTION IF EXISTS app_private.media_path_from_url(text);

-- DropForeignKey
ALTER TABLE "_BlogPostToTag" DROP CONSTRAINT "_BlogPostToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_BlogPostToTag" DROP CONSTRAINT "_BlogPostToTag_B_fkey";

-- DropForeignKey
ALTER TABLE "_ExperienceToTag" DROP CONSTRAINT "_ExperienceToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_ExperienceToTag" DROP CONSTRAINT "_ExperienceToTag_B_fkey";

-- DropForeignKey
ALTER TABLE "_ProjectToTag" DROP CONSTRAINT "_ProjectToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProjectToTag" DROP CONSTRAINT "_ProjectToTag_B_fkey";

-- DropIndex
DROP INDEX "MediaFile_url_key";

-- AlterTable
ALTER TABLE "BlogPost" DROP COLUMN "coverImage";

-- AlterTable
ALTER TABLE "Experience" DROP COLUMN "images",
DROP COLUMN "logo";

-- AlterTable
ALTER TABLE "MediaFile" DROP COLUMN "url",
DROP COLUMN "usedIn";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "images",
DROP COLUMN "logo";

-- AlterTable
ALTER TABLE "SiteSettings" DROP COLUMN "aboutPhoto",
DROP COLUMN "faviconUrl";

-- DropTable
DROP TABLE "_BlogPostToTag";

-- DropTable
DROP TABLE "_ExperienceToTag";

-- DropTable
DROP TABLE "_ProjectToTag";

