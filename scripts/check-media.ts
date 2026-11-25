/**
 * Read-only media check (Phase 6). Finds broken or unoptimised images without changing anything:
 *
 *   - every MediaFile: the public object answers 200 with the stored type; images without
 *     width/height/blur (uploads before Phase 6, see backfill-media-meta.ts) and large originals
 *   - every media reference (logos, cover, about photo, favicon, documents, attachments): the
 *     MediaFile row exists
 *   - every <img> in HTML content (README, blog, bios, descriptions): own-bucket images have a
 *     MediaFile row, external images answer 200
 *
 *   (set -a; . ./.env.prod.local; set +a; npx tsx scripts/check-media.ts)
 *
 * Connects with DIRECT_URL inside a READ ONLY transaction; exits 1 when something is broken.
 */
import { Client } from "pg";
import { mediaPathFromUrl, mediaUrl } from "../lib/media/url";

const LARGE_IMAGE_BYTES = 1024 * 1024;
const USER_AGENT = "demircucu-media-check";

type Finding = { level: "broken" | "warn"; where: string; detail: string };

interface MediaRow {
  path: string;
  type: string;
  size: number;
  width: number | null;
  height: number | null;
  blur: boolean;
}

async function head(url: string): Promise<{ status: number; type: string | null }> {
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    // Some hosts do not implement HEAD.
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Range: "bytes=0-0" },
        signal: AbortSignal.timeout(15_000),
      });
      await res.body?.cancel();
    }
    return { status: res.status, type: res.headers.get("content-type") };
  } catch {
    return { status: 0, type: null };
  }
}

function imgSources(html: string): string[] {
  return [...html.matchAll(/<img\b[^>]*?\ssrc\s*=\s*"([^"]*)"/gi)].map((m) =>
    m[1]!.replaceAll("&amp;", "&"),
  );
}

async function main(): Promise<void> {
  if (!process.env.DIRECT_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("DIRECT_URL and NEXT_PUBLIC_SUPABASE_URL are required");
  }
  const db = new Client({ connectionString: process.env.DIRECT_URL });
  await db.connect();
  await db.query("BEGIN READ ONLY");
  const findings: Finding[] = [];

  try {
    const media = new Map<string, MediaRow>(
      (
        await db.query<MediaRow>(
          `SELECT path, type, size, width, height, "blurDataUrl" IS NOT NULL AS blur
           FROM public."MediaFile"`,
        )
      ).rows.map((r) => [r.path, r]),
    );

    // 1. Media files
    for (const file of media.values()) {
      const where = `MediaFile ${file.path}`;
      const res = await head(mediaUrl(file.path)!);
      if (res.status !== 200)
        findings.push({ level: "broken", where, detail: `HTTP ${res.status}` });
      else if (res.type && !res.type.startsWith(file.type)) {
        findings.push({
          level: "warn",
          where,
          detail: `served as ${res.type}, row says ${file.type}`,
        });
      }
      if (file.type.startsWith("image/") && file.type !== "image/x-icon") {
        if (!file.width || !file.height || !file.blur) {
          findings.push({ level: "warn", where, detail: "no width/height/blur (run backfill)" });
        }
        if (file.size > LARGE_IMAGE_BYTES) {
          findings.push({
            level: "warn",
            where,
            detail: `${(file.size / 1024 / 1024).toFixed(1)} MB original (optimizer serves resized copies)`,
          });
        }
      }
    }

    // 2. Path references
    const refs = await db.query<{ where: string; path: string }>(`
      SELECT 'Project.logoPath ' || slug AS where, "logoPath" AS path FROM public."Project" WHERE "logoPath" IS NOT NULL
      UNION ALL SELECT 'Experience.logoPath ' || company, "logoPath" FROM public."Experience" WHERE "logoPath" IS NOT NULL
      UNION ALL SELECT 'BlogPost.coverPath ' || slug, "coverPath" FROM public."BlogPost" WHERE "coverPath" IS NOT NULL
      UNION ALL SELECT 'SiteSettings.aboutPhotoPath', "aboutPhotoPath" FROM public."SiteSettings" WHERE "aboutPhotoPath" IS NOT NULL
      UNION ALL SELECT 'SiteSettings.faviconPath', "faviconPath" FROM public."SiteSettings" WHERE "faviconPath" IS NOT NULL
      UNION ALL SELECT t.kind || '.files ' || t.key, f->>'path'
        FROM (
          SELECT 'Project' AS kind, slug AS key, files FROM public."Project"
          UNION ALL SELECT 'Experience', company, files FROM public."Experience"
          UNION ALL SELECT 'BlogPost', slug, files FROM public."BlogPost"
        ) t, jsonb_array_elements(CASE WHEN jsonb_typeof(t.files) = 'array' THEN t.files ELSE '[]' END) f
        WHERE f ? 'path'`);
    for (const ref of refs.rows) {
      if (!media.has(ref.path)) {
        findings.push({
          level: "broken",
          where: ref.where,
          detail: `no MediaFile for ${ref.path}`,
        });
      }
    }
    const docs = await db.query<{ where: string }>(`
      SELECT 'ProjectDocument ' || d."repoPath" AS where FROM public."ProjectDocument" d
      LEFT JOIN public."MediaFile" m ON m.id = d."mediaFileId"
      WHERE d."mediaFileId" IS NOT NULL AND m.id IS NULL`);
    for (const doc of docs.rows)
      findings.push({ level: "broken", where: doc.where, detail: "missing file" });

    // 3. Images inside HTML
    const html = await db.query<{ where: string; html: string }>(`
      SELECT 'Project.readmeHtml ' || slug AS where, "readmeHtml" AS html FROM public."Project" WHERE "readmeHtml" LIKE '%<img%'
      UNION ALL SELECT 'Project.description ' || slug, coalesce("descriptionTr", '') || coalesce("descriptionEn", '') FROM public."Project"
      UNION ALL SELECT 'Experience.details ' || company, coalesce("detailsTr", '') || coalesce("detailsEn", '') FROM public."Experience"
      UNION ALL SELECT 'BlogPost.content ' || slug, "contentTr" || "contentEn" FROM public."BlogPost"
      UNION ALL SELECT 'SiteSettings.aboutBio', coalesce("aboutBioTr", '') || coalesce("aboutBioEn", '') FROM public."SiteSettings"`);
    const external = new Map<string, string>();
    let htmlImages = 0;
    for (const row of html.rows) {
      for (const src of imgSources(row.html)) {
        htmlImages++;
        const path = mediaPathFromUrl(src);
        if (path) {
          if (!media.has(path)) {
            findings.push({
              level: "broken",
              where: row.where,
              detail: `no MediaFile for ${path}`,
            });
          }
        } else if (/^https?:\/\//.test(src)) external.set(src, row.where);
        else
          findings.push({
            level: "broken",
            where: row.where,
            detail: `unusable src ${src.slice(0, 80)}`,
          });
      }
    }
    for (const [src, where] of external) {
      const res = await head(src);
      if (res.status < 200 || res.status >= 400) {
        findings.push({ level: "broken", where, detail: `HTTP ${res.status} ${src}` });
      }
    }

    const broken = findings.filter((f) => f.level === "broken");
    console.log(
      `Media files: ${media.size}; references: ${refs.rowCount}; HTML images: ${htmlImages} (${external.size} external)`,
    );
    for (const f of findings)
      console.log(`${f.level.toUpperCase().padEnd(6)} ${f.where}: ${f.detail}`);
    console.log(broken.length ? `\n${broken.length} broken` : "\nNo broken media.");
    process.exitCode = broken.length ? 1 : 0;
  } finally {
    await db.query("ROLLBACK");
    await db.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
