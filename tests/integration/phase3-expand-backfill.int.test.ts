/**
 * Replays the migrations on a scratch database with legacy-shaped rows, applies the Phase 3
 * expand migration and checks the backfill (URL -> storage path, tag join tables, attachments,
 * MediaUsage). The shared test database cannot be used: it already has every migration applied.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveTestDatabaseUrl } from "@/tests/setup/test-db";

const EXPAND = "20261124120000_phase3_expand";
const MIGRATIONS_DIR = path.join(process.cwd(), "prisma/migrations");
const HOST = "https://abc.supabase.co/storage/v1/object/public/media/";

const baseUrl = new URL(resolveTestDatabaseUrl());
const dbName = `${baseUrl.pathname.slice(1)}_backfill`;
const scratchUrl = new URL(baseUrl);
scratchUrl.pathname = `/${dbName}`;

const migrationSql = (name: string) =>
  readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");

let db: Client;

beforeAll(async () => {
  const admin = new Client({ connectionString: baseUrl.toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  db = new Client({ connectionString: scratchUrl.toString() });
  await db.connect();
  const names = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const name of names) {
    if (name === EXPAND) break;
    await db.query(migrationSql(name));
  }

  await db.query(`
    INSERT INTO "MediaFile" (id, name, url, type, size, path) VALUES
      ('m1', 'logo', '${HOST}projects/a.png', 'image/png', 1, 'projects/a.png'),
      ('m2', 'doc', '${HOST}general/doc.pdf', 'application/pdf', 1, 'general/doc.pdf'),
      ('m3', 'photo', '${HOST}settings/photo.png', 'image/png', 1, 'settings/photo.png'),
      ('m4', 'favicon', '${HOST}settings/fav.png', 'image/png', 1, 'settings/fav.png'),
      ('m5', 'inline', '${HOST}blog/inline.png', 'image/png', 1, 'blog/inline.png');

    INSERT INTO "Project" (id, "titleTr", "titleEn", slug, "summaryTr", "summaryEn", logo, files,
      "descriptionTr", "updatedAt") VALUES
      ('p1', 'P', 'P', 'p', 's', 's', '${HOST}projects/a.png',
       '[{"name":"Doc","url":"${HOST}general/doc.pdf"},{"name":"Ext","url":"https://example.com/x.pdf"}]',
       '<p>x</p><img src="${HOST}blog/inline.png" alt="">', now());

    INSERT INTO "Experience" (id, company, "positionTr", "positionEn", "descriptionTr",
      "descriptionEn", "startDate", logo, "updatedAt") VALUES
      ('e1', 'Vestel', 'p', 'p', 'd', 'd', now(), 'https://statics.example.com/logo.png', now());

    INSERT INTO "BlogPost" (id, "titleTr", "titleEn", slug, "excerptTr", "excerptEn", "contentTr",
      "contentEn", "coverImage", "authorId", "updatedAt") VALUES
      ('b1', 'B', 'B', 'b', 'e', 'e', 'c', 'c', '${HOST}blog/missing.png', 'u1', now());

    INSERT INTO "SiteSettings" (id, "aboutPhoto", "faviconUrl", "updatedAt") VALUES
      ('main', '${HOST}settings/photo.png', '${HOST}settings/fav.png', now());

    INSERT INTO "Tag" (id, "nameTr", "nameEn", slug) VALUES ('t1', 'Yapay Zeka', 'AI', 'ai');
    INSERT INTO "_ProjectToTag" ("A", "B") VALUES ('p1', 't1');
    INSERT INTO "_ExperienceToTag" ("A", "B") VALUES ('e1', 't1');
    INSERT INTO "_BlogPostToTag" ("A", "B") VALUES ('b1', 't1');
  `);

  await db.query(migrationSql(EXPAND));
}, 120_000);

afterAll(async () => {
  await db?.end();
  const admin = new Client({ connectionString: baseUrl.toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.end();
});

const one = async <T>(sql: string) => (await db.query(sql)).rows[0] as T;

describe("phase 3 expand migration backfill", () => {
  it("converts own-bucket URLs to storage paths and leaves the legacy columns untouched", async () => {
    expect(await one(`SELECT "logoPath", logo FROM "Project" WHERE id = 'p1'`)).toEqual({
      logoPath: "projects/a.png",
      logo: `${HOST}projects/a.png`,
    });
    expect(
      await one(`SELECT "aboutPhotoPath", "faviconPath" FROM "SiteSettings" WHERE id = 'main'`),
    ).toEqual({ aboutPhotoPath: "settings/photo.png", faviconPath: "settings/fav.png" });
  });

  it("leaves external URLs and URLs without a MediaFile row unconverted", async () => {
    expect(await one(`SELECT "logoPath", logo FROM "Experience" WHERE id = 'e1'`)).toEqual({
      logoPath: null,
      logo: "https://statics.example.com/logo.png",
    });
    expect(await one(`SELECT "coverPath" FROM "BlogPost" WHERE id = 'b1'`)).toEqual({
      coverPath: null,
    });
  });

  it("adds a path to own-media attachments and keeps the url for the previous release", async () => {
    const { files } = await one<{ files: unknown }>(`SELECT files FROM "Project" WHERE id = 'p1'`);
    expect(files).toEqual([
      { name: "Doc", url: `${HOST}general/doc.pdf`, path: "general/doc.pdf" },
      { name: "Ext", url: "https://example.com/x.pdf" },
    ]);
  });

  it("records attachment and rich-text references in MediaUsage", async () => {
    const { rows } = await db.query(
      `SELECT "mediaFileId", "entityType", "entityId", field FROM "MediaUsage" ORDER BY 1`,
    );
    expect(rows).toEqual([
      { mediaFileId: "m2", entityType: "PROJECT", entityId: "p1", field: "files" },
      { mediaFileId: "m5", entityType: "PROJECT", entityId: "p1", field: "description" },
    ]);
  });

  it("copies the implicit tag relations to the join tables as MANUAL", async () => {
    expect(await one(`SELECT "projectId", "tagId", source FROM "ProjectTag"`)).toEqual({
      projectId: "p1",
      tagId: "t1",
      source: "MANUAL",
    });
    expect((await db.query(`SELECT 1 FROM "ExperienceTag"`)).rowCount).toBe(1);
    expect((await db.query(`SELECT 1 FROM "BlogPostTag"`)).rowCount).toBe(1);
  });

  it("fills Tag.name from the English name", async () => {
    expect(await one(`SELECT name FROM "Tag" WHERE id = 't1'`)).toEqual({ name: "AI" });
  });

  it("enables row level security on every table", async () => {
    const { rows } = await db.query(`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`);
    expect(rows).toEqual([]);
  });
});
