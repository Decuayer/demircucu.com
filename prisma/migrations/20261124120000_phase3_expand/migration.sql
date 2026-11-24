-- Phase 3, expand step (task 1.1, 2.1, 8.1). Additive only: the previous release keeps working
-- on the legacy columns until the new code is deployed. The contract migration (separate PR)
-- drops the legacy columns and tables after the deploy is verified.
--
--   1. Generated DDL: enums, new columns, new tables, indexes, foreign keys.
--   2. Backfill: Tag.name, URL -> storage path, implicit tag relations -> join tables,
--      attachment paths and MediaUsage rows.
--   3. Integrity triggers: no cycles in the tag tree, aliases never equal a slug.
--   4. Row level security on every new table (same rule as 20261124004800_rls_lockdown).
--
-- Media references point to MediaFile.path with ON DELETE RESTRICT. Only URLs of the public
-- `media` bucket whose path has a MediaFile row are converted; anything else (the one external
-- experience logo) stays in the legacy column and is dropped by the contract migration.

-- CreateEnum
CREATE TYPE "TagKind" AS ENUM ('LANGUAGE', 'FRAMEWORK', 'LIBRARY', 'DATABASE', 'TOOL', 'PLATFORM', 'CLOUD', 'CONCEPT', 'DOMAIN', 'TOPIC');

-- CreateEnum
CREATE TYPE "TagSource" AS ENUM ('GITHUB', 'MANUAL', 'LANGUAGE');

-- CreateEnum
CREATE TYPE "UnmappedTopicStatus" AS ENUM ('PENDING', 'MAPPED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ProjectSource" AS ENUM ('MANUAL', 'GITHUB');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('OK', 'ERROR', 'PENDING');

-- CreateEnum
CREATE TYPE "SyncTrigger" AS ENUM ('MANUAL', 'CRON', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "SyncRunStatus" AS ENUM ('RUNNING', 'OK', 'PARTIAL', 'ERROR');

-- CreateEnum
CREATE TYPE "MediaSource" AS ENUM ('UPLOAD', 'GITHUB');

-- CreateEnum
CREATE TYPE "MediaEntityType" AS ENUM ('PROJECT', 'EXPERIENCE', 'BLOG_POST', 'SITE_SETTINGS');

-- CreateEnum
CREATE TYPE "AnalyticsEntityType" AS ENUM ('HOME', 'PROJECT', 'BLOG', 'EXPERIENCE', 'SKILL', 'PAGE');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET', 'OTHER');

-- CreateEnum
CREATE TYPE "OutboundTarget" AS ENUM ('GITHUB', 'LIVE', 'DOCUMENT', 'OTHER');

-- DropIndex
DROP INDEX "Tag_nameEn_key";

-- DropIndex
DROP INDEX "Tag_nameTr_key";

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "coverPath" TEXT;

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "logoPath" TEXT;

-- AlterTable
ALTER TABLE "MediaFile" ADD COLUMN     "altEn" TEXT,
ADD COLUMN     "altTr" TEXT,
ADD COLUMN     "blurDataUrl" TEXT,
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "originUrl" TEXT,
ADD COLUMN     "repoFullName" TEXT,
ADD COLUMN     "source" "MediaSource" NOT NULL DEFAULT 'UPLOAD',
ADD COLUMN     "width" INTEGER,
ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "defaultBranch" TEXT,
ADD COLUMN     "forks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "githubDescription" TEXT,
ADD COLUMN     "githubFullName" TEXT,
ADD COLUMN     "githubRepoId" BIGINT,
ADD COLUMN     "homepage" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFork" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "languages" JSONB,
ADD COLUMN     "languagesEtag" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "license" TEXT,
ADD COLUMN     "logoPath" TEXT,
ADD COLUMN     "primaryLanguage" TEXT,
ADD COLUMN     "pushedAt" TIMESTAMP(3),
ADD COLUMN     "readmeEtag" TEXT,
ADD COLUMN     "readmeHtml" TEXT,
ADD COLUMN     "readmeMarkdown" TEXT,
ADD COLUMN     "readmeSha" TEXT,
ADD COLUMN     "repoCreatedAt" TIMESTAMP(3),
ADD COLUMN     "source" "ProjectSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "stars" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "syncError" TEXT,
ADD COLUMN     "syncStatus" "SyncStatus",
ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "treeSha" TEXT,
ALTER COLUMN "titleTr" DROP NOT NULL,
ALTER COLUMN "titleEn" DROP NOT NULL,
ALTER COLUMN "summaryTr" DROP NOT NULL,
ALTER COLUMN "summaryEn" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "aboutPhotoPath" TEXT,
ADD COLUMN     "faviconPath" TEXT;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "descriptionTr" TEXT,
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "isSkill" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "kind" "TagKind" NOT NULL DEFAULT 'TOPIC',
ADD COLUMN     "name" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "nameTr" DROP NOT NULL,
ALTER COLUMN "nameEn" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TagAlias" (
    "alias" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagAlias_pkey" PRIMARY KEY ("alias")
);

-- CreateTable
CREATE TABLE "ProjectTag" (
    "projectId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "source" "TagSource" NOT NULL DEFAULT 'MANUAL',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTag_pkey" PRIMARY KEY ("projectId","tagId")
);

-- CreateTable
CREATE TABLE "ExperienceTag" (
    "experienceId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "source" "TagSource" NOT NULL DEFAULT 'MANUAL',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceTag_pkey" PRIMARY KEY ("experienceId","tagId")
);

-- CreateTable
CREATE TABLE "BlogPostTag" (
    "blogPostId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "source" "TagSource" NOT NULL DEFAULT 'MANUAL',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogPostTag_pkey" PRIMARY KEY ("blogPostId","tagId")
);

-- CreateTable
CREATE TABLE "UnmappedTopic" (
    "topic" TEXT NOT NULL,
    "status" "UnmappedTopicStatus" NOT NULL DEFAULT 'PENDING',
    "tagId" TEXT,
    "seenIn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "UnmappedTopic_pkey" PRIMARY KEY ("topic")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "repoPath" TEXT NOT NULL,
    "mediaFileId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSlugHistory" (
    "slug" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSlugHistory_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "GithubSyncRun" (
    "id" TEXT NOT NULL,
    "trigger" "SyncTrigger" NOT NULL,
    "scope" TEXT,
    "status" "SyncRunStatus" NOT NULL DEFAULT 'RUNNING',
    "stats" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "GithubSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubEtag" (
    "key" TEXT NOT NULL,
    "etag" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubEtag_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "MediaUsage" (
    "id" TEXT NOT NULL,
    "mediaFileId" TEXT NOT NULL,
    "entityType" "MediaEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "entityType" "AnalyticsEntityType" NOT NULL,
    "entityId" TEXT,
    "referrerHost" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "country" TEXT,
    "deviceType" "DeviceType" NOT NULL DEFAULT 'OTHER',
    "browser" TEXT,
    "os" TEXT,
    "visitorHash" TEXT NOT NULL,
    "sessionId" TEXT,
    "durationMs" INTEGER,
    "scrollDepth" INTEGER,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundClick" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageViewId" TEXT,
    "entityType" "AnalyticsEntityType" NOT NULL,
    "entityId" TEXT,
    "target" "OutboundTarget" NOT NULL,
    "targetHost" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,

    CONSTRAINT "OutboundClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStat" (
    "date" DATE NOT NULL,
    "entityType" "AnalyticsEntityType" NOT NULL,
    "entityKey" TEXT NOT NULL DEFAULT '',
    "dimension" TEXT NOT NULL DEFAULT 'total',
    "value" TEXT NOT NULL DEFAULT '',
    "views" INTEGER NOT NULL DEFAULT 0,
    "visitors" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("date","entityType","entityKey","dimension","value")
);

-- CreateTable
CREATE TABLE "AnalyticsSalt" (
    "date" DATE NOT NULL,
    "salt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSalt_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE INDEX "TagAlias_tagId_idx" ON "TagAlias"("tagId");

-- CreateIndex
CREATE INDEX "ProjectTag_tagId_idx" ON "ProjectTag"("tagId");

-- CreateIndex
CREATE INDEX "ExperienceTag_tagId_idx" ON "ExperienceTag"("tagId");

-- CreateIndex
CREATE INDEX "BlogPostTag_tagId_idx" ON "BlogPostTag"("tagId");

-- CreateIndex
CREATE INDEX "UnmappedTopic_status_idx" ON "UnmappedTopic"("status");

-- CreateIndex
CREATE INDEX "ProjectDocument_mediaFileId_idx" ON "ProjectDocument"("mediaFileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDocument_projectId_repoPath_key" ON "ProjectDocument"("projectId", "repoPath");

-- CreateIndex
CREATE INDEX "ProjectSlugHistory_projectId_idx" ON "ProjectSlugHistory"("projectId");

-- CreateIndex
CREATE INDEX "GithubSyncRun_startedAt_idx" ON "GithubSyncRun"("startedAt");

-- CreateIndex
CREATE INDEX "MediaUsage_entityType_entityId_idx" ON "MediaUsage"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_mediaFileId_entityType_entityId_field_key" ON "MediaUsage"("mediaFileId", "entityType", "entityId", "field");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_entityType_entityId_createdAt_idx" ON "PageView"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_path_createdAt_idx" ON "PageView"("path", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_visitorHash_path_createdAt_idx" ON "PageView"("visitorHash", "path", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundClick_createdAt_idx" ON "OutboundClick"("createdAt");

-- CreateIndex
CREATE INDEX "OutboundClick_entityType_entityId_createdAt_idx" ON "OutboundClick"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyStat_entityType_entityKey_dimension_date_idx" ON "DailyStat"("entityType", "entityKey", "dimension", "date");

-- CreateIndex
CREATE INDEX "DailyStat_dimension_date_idx" ON "DailyStat"("dimension", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_path_key" ON "MediaFile"("path");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_contentHash_key" ON "MediaFile"("contentHash");

-- CreateIndex
CREATE INDEX "MediaFile_source_repoFullName_idx" ON "MediaFile"("source", "repoFullName");

-- CreateIndex
CREATE UNIQUE INDEX "Project_githubRepoId_key" ON "Project"("githubRepoId");

-- CreateIndex
CREATE INDEX "Tag_parentId_idx" ON "Tag"("parentId");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagAlias" ADD CONSTRAINT "TagAlias_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTag" ADD CONSTRAINT "ProjectTag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTag" ADD CONSTRAINT "ProjectTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceTag" ADD CONSTRAINT "ExperienceTag_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceTag" ADD CONSTRAINT "ExperienceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostTag" ADD CONSTRAINT "BlogPostTag_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostTag" ADD CONSTRAINT "BlogPostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnmappedTopic" ADD CONSTRAINT "UnmappedTopic_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_logoPath_fkey" FOREIGN KEY ("logoPath") REFERENCES "MediaFile"("path") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_logoPath_fkey" FOREIGN KEY ("logoPath") REFERENCES "MediaFile"("path") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSlugHistory" ADD CONSTRAINT "ProjectSlugHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_coverPath_fkey" FOREIGN KEY ("coverPath") REFERENCES "MediaFile"("path") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_aboutPhotoPath_fkey" FOREIGN KEY ("aboutPhotoPath") REFERENCES "MediaFile"("path") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_faviconPath_fkey" FOREIGN KEY ("faviconPath") REFERENCES "MediaFile"("path") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundClick" ADD CONSTRAINT "OutboundClick_pageViewId_fkey" FOREIGN KEY ("pageViewId") REFERENCES "PageView"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------------------------

UPDATE "Tag" SET "name" = COALESCE(NULLIF("nameEn", ''), NULLIF("nameTr", ''), "slug") WHERE "name" IS NULL;
ALTER TABLE "Tag" ALTER COLUMN "name" SET NOT NULL;

-- Storage path from a public object URL of the media bucket, or NULL.
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

CREATE OR REPLACE FUNCTION app_private.media_path_from_url(url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $fn$
  SELECT substring(url FROM '^https?://[^/]+/storage/v1/object/public/media/([^?#]+)$')
$fn$;
REVOKE ALL ON FUNCTION app_private.media_path_from_url(text) FROM PUBLIC;

UPDATE "Project" p SET "logoPath" = m.path
FROM "MediaFile" m WHERE m.path = app_private.media_path_from_url(p."logo") AND p."logoPath" IS NULL;

UPDATE "Experience" e SET "logoPath" = m.path
FROM "MediaFile" m WHERE m.path = app_private.media_path_from_url(e."logo") AND e."logoPath" IS NULL;

UPDATE "BlogPost" b SET "coverPath" = m.path
FROM "MediaFile" m WHERE m.path = app_private.media_path_from_url(b."coverImage") AND b."coverPath" IS NULL;

UPDATE "SiteSettings" s SET "aboutPhotoPath" = m.path
FROM "MediaFile" m WHERE m.path = app_private.media_path_from_url(s."aboutPhoto") AND s."aboutPhotoPath" IS NULL;

UPDATE "SiteSettings" s SET "faviconPath" = m.path
FROM "MediaFile" m WHERE m.path = app_private.media_path_from_url(s."faviconUrl") AND s."faviconPath" IS NULL;

-- Attachments: add "path" next to "url" for own media (the legacy release still reads "url";
-- the contract migration removes it).
CREATE OR REPLACE FUNCTION app_private.attachments_with_paths(files jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $fn$
  SELECT COALESCE(jsonb_agg(
    CASE WHEN m.path IS NOT NULL THEN t.elem || jsonb_build_object('path', m.path) ELSE t.elem END
    ORDER BY t.ord), '[]'::jsonb)
  FROM jsonb_array_elements(files) WITH ORDINALITY AS t(elem, ord)
  LEFT JOIN public."MediaFile" m ON m.path = app_private.media_path_from_url(t.elem ->> 'url')
$fn$;
REVOKE ALL ON FUNCTION app_private.attachments_with_paths(jsonb) FROM PUBLIC;

UPDATE "Project" SET "files" = app_private.attachments_with_paths("files")
WHERE jsonb_typeof("files") = 'array' AND jsonb_array_length("files") > 0;
UPDATE "Experience" SET "files" = app_private.attachments_with_paths("files")
WHERE jsonb_typeof("files") = 'array' AND jsonb_array_length("files") > 0;
UPDATE "BlogPost" SET "files" = app_private.attachments_with_paths("files")
WHERE jsonb_typeof("files") = 'array' AND jsonb_array_length("files") > 0;

DROP FUNCTION app_private.attachments_with_paths(jsonb);

-- MediaUsage for attachments and for images inside rich text.
INSERT INTO "MediaUsage" ("id", "mediaFileId", "entityType", "entityId", "field")
SELECT DISTINCT ON (m.id, refs.entity_type, refs.entity_id, refs.field)
  gen_random_uuid()::text, m.id, refs.entity_type::"MediaEntityType", refs.entity_id, refs.field
FROM (
  SELECT 'PROJECT' entity_type, p.id entity_id, 'files' field, f ->> 'path' path
    FROM "Project" p, jsonb_array_elements(CASE WHEN jsonb_typeof(p."files") = 'array' THEN p."files" ELSE '[]' END) f
  UNION ALL
  SELECT 'EXPERIENCE', e.id, 'files', f ->> 'path'
    FROM "Experience" e, jsonb_array_elements(CASE WHEN jsonb_typeof(e."files") = 'array' THEN e."files" ELSE '[]' END) f
  UNION ALL
  SELECT 'BLOG_POST', b.id, 'files', f ->> 'path'
    FROM "BlogPost" b, jsonb_array_elements(CASE WHEN jsonb_typeof(b."files") = 'array' THEN b."files" ELSE '[]' END) f
  UNION ALL
  SELECT 'PROJECT', p.id, 'description', app_private.media_path_from_url(r[1])
    FROM "Project" p, regexp_matches(COALESCE(p."descriptionTr", '') || COALESCE(p."descriptionEn", ''), '<img[^>]*\ssrc="([^"]+)"', 'g') r
  UNION ALL
  SELECT 'EXPERIENCE', e.id, 'details', app_private.media_path_from_url(r[1])
    FROM "Experience" e, regexp_matches(COALESCE(e."detailsTr", '') || COALESCE(e."detailsEn", ''), '<img[^>]*\ssrc="([^"]+)"', 'g') r
  UNION ALL
  SELECT 'BLOG_POST', b.id, 'content', app_private.media_path_from_url(r[1])
    FROM "BlogPost" b, regexp_matches(b."contentTr" || b."contentEn", '<img[^>]*\ssrc="([^"]+)"', 'g') r
  UNION ALL
  SELECT 'SITE_SETTINGS', s.id, 'aboutBio', app_private.media_path_from_url(r[1])
    FROM "SiteSettings" s, regexp_matches(COALESCE(s."aboutBioTr", '') || COALESCE(s."aboutBioEn", ''), '<img[^>]*\ssrc="([^"]+)"', 'g') r
) refs
JOIN "MediaFile" m ON m.path = refs.path
ON CONFLICT DO NOTHING;

-- Implicit many-to-many tables: column "A" is the content row, "B" the tag (alphabetical model order).
INSERT INTO "ProjectTag" ("projectId", "tagId", "source") SELECT "A", "B", 'MANUAL' FROM "_ProjectToTag" ON CONFLICT DO NOTHING;
INSERT INTO "ExperienceTag" ("experienceId", "tagId", "source") SELECT "A", "B", 'MANUAL' FROM "_ExperienceToTag" ON CONFLICT DO NOTHING;
INSERT INTO "BlogPostTag" ("blogPostId", "tagId", "source") SELECT "A", "B", 'MANUAL' FROM "_BlogPostToTag" ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------------------------
-- Integrity triggers (task 2.5). SQLSTATE 23514 (check_violation) so the app can map them.
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app_private.tag_parent_no_cycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  IF NEW."parentId" IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW."parentId" = NEW.id OR EXISTS (
    WITH RECURSIVE ancestors(id, depth) AS (
      SELECT t."parentId", 1 FROM public."Tag" t WHERE t.id = NEW."parentId"
      UNION ALL
      SELECT t."parentId", a.depth + 1 FROM public."Tag" t JOIN ancestors a ON t.id = a.id
      WHERE a.id IS NOT NULL AND a.depth < 1000
    )
    SELECT 1 FROM ancestors WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'tag tree cycle: % cannot be a descendant of itself', NEW.id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'tag_parent_no_cycle';
  END IF;
  RETURN NEW;
END
$fn$;
REVOKE ALL ON FUNCTION app_private.tag_parent_no_cycle() FROM PUBLIC;

CREATE TRIGGER tag_parent_no_cycle
BEFORE INSERT OR UPDATE OF "parentId" ON "Tag"
FOR EACH ROW EXECUTE FUNCTION app_private.tag_parent_no_cycle();

CREATE OR REPLACE FUNCTION app_private.tag_alias_not_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  IF TG_TABLE_NAME = 'TagAlias' THEN
    IF EXISTS (SELECT 1 FROM public."Tag" t WHERE t.slug = NEW.alias) THEN
      RAISE EXCEPTION 'alias "%" equals a tag slug', NEW.alias
        USING ERRCODE = 'check_violation', CONSTRAINT = 'tag_alias_not_slug';
    END IF;
  ELSIF EXISTS (SELECT 1 FROM public."TagAlias" a WHERE a.alias = NEW.slug) THEN
    RAISE EXCEPTION 'slug "%" is already an alias', NEW.slug
      USING ERRCODE = 'check_violation', CONSTRAINT = 'tag_alias_not_slug';
  END IF;
  RETURN NEW;
END
$fn$;
REVOKE ALL ON FUNCTION app_private.tag_alias_not_slug() FROM PUBLIC;

CREATE TRIGGER tag_alias_not_slug
BEFORE INSERT OR UPDATE OF "alias" ON "TagAlias"
FOR EACH ROW EXECUTE FUNCTION app_private.tag_alias_not_slug();

CREATE TRIGGER tag_slug_not_alias
BEFORE INSERT OR UPDATE OF "slug" ON "Tag"
FOR EACH ROW EXECUTE FUNCTION app_private.tag_alias_not_slug();

-- ---------------------------------------------------------------------------------------------
-- Row level security on the new tables (no policies: client roles see nothing). Client-role
-- grants were already revoked for future objects by 20261124004800_rls_lockdown.
-- ---------------------------------------------------------------------------------------------

DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.relname);
  END LOOP;
END
$$;
