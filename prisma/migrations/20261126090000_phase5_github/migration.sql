-- Phase 5: GitHub sync.
--   * UnmappedTopic is dropped (Phase 4 decision: unknown topics become tags straight away; the
--     table was never written). The migration stops if it unexpectedly holds rows.
--   * ProjectDocument keeps PDFs above the mirror limit as GitHub links (mediaFileId nullable,
--     htmlUrl). The table has never been written, so the NOT NULL column needs no backfill.
--   * Project.readmeVersion records the README pipeline version that produced readmeHtml.
--   * GithubSyncSettings: one row, created here. autoPublishAfter = the moment this migration
--     runs, so every repository that already exists is imported as a draft.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "UnmappedTopic") THEN
    RAISE EXCEPTION 'UnmappedTopic is not empty; review its rows before dropping it';
  END IF;
  IF EXISTS (SELECT 1 FROM "ProjectDocument") THEN
    RAISE EXCEPTION 'ProjectDocument is not empty; htmlUrl needs a backfill';
  END IF;
END
$$;

-- DropForeignKey
ALTER TABLE "UnmappedTopic" DROP CONSTRAINT "UnmappedTopic_tagId_fkey";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "readmeVersion" INTEGER;

-- AlterTable
ALTER TABLE "ProjectDocument" ADD COLUMN     "htmlUrl" TEXT NOT NULL,
ALTER COLUMN "mediaFileId" DROP NOT NULL;

-- DropTable
DROP TABLE "UnmappedTopic";

-- DropEnum
DROP TYPE "UnmappedTopicStatus";

-- CreateTable
CREATE TABLE "GithubSyncSettings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "includeForks" BOOLEAN NOT NULL DEFAULT false,
    "includeArchived" BOOLEAN NOT NULL DEFAULT false,
    "autoPublishAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubSyncSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "GithubSyncSettings" ("id", "updatedAt") VALUES ('main', CURRENT_TIMESTAMP);

-- Same lockdown as every other table: RLS on, no policies (client roles were already denied
-- grants on future objects by 20261124004800_rls_lockdown).
ALTER TABLE "GithubSyncSettings" ENABLE ROW LEVEL SECURITY;
