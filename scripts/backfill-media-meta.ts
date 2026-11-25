/**
 * Fills width, height and blurDataUrl of images uploaded before Phase 6 (the upload route did not
 * measure them). Only these three columns change; stored files are never rewritten (the image
 * optimizer already serves resized copies of large originals).
 *
 *   (set -a; . ./.env.prod.local; set +a; npx tsx scripts/backfill-media-meta.ts)          # dry run
 *   (set -a; . ./.env.prod.local; set +a; npx tsx scripts/backfill-media-meta.ts --apply)
 *
 * Dry-run by default: downloads each image, prints what would be written and rolls back. With
 * --apply all updates run in one transaction. Idempotent: rows that already have all three
 * values are skipped. Uses its own single connection (DIRECT_URL).
 */
import { Client } from "pg";
import sharp from "sharp";
import { mediaUrl } from "../lib/media/url";

const MAX_DOWNLOAD_BYTES = 30 * 1024 * 1024;

interface Row {
  id: string;
  path: string;
  type: string;
}

export async function measure(
  bytes: Buffer,
): Promise<{ width: number; height: number; blurDataUrl: string }> {
  // EXIF orientation applied, as the browser displays it.
  const { data, info } = await sharp(bytes).rotate().toBuffer({ resolveWithObject: true });
  const tiny = await sharp(data).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  return {
    width: info.width,
    height: info.height,
    blurDataUrl: `data:image/webp;base64,${tiny.toString("base64")}`,
  };
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_DOWNLOAD_BYTES) throw new Error("too large");
  return bytes;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  if (!process.env.DIRECT_URL || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("DIRECT_URL and NEXT_PUBLIC_SUPABASE_URL are required");
  }
  const db = new Client({ connectionString: process.env.DIRECT_URL });
  await db.connect();
  await db.query("BEGIN");
  let failed = 0;
  try {
    const { rows } = await db.query<Row>(`
      SELECT id, path, type FROM public."MediaFile"
      WHERE type LIKE 'image/%' AND type <> 'image/x-icon'
        AND (width IS NULL OR height IS NULL OR "blurDataUrl" IS NULL)
      ORDER BY "createdAt"`);
    console.log(`${rows.length} image(s) without dimensions or blur.`);
    for (const row of rows) {
      try {
        const meta = await measure(await download(mediaUrl(row.path)!));
        await db.query(
          `UPDATE public."MediaFile" SET width = $2, height = $3, "blurDataUrl" = $4 WHERE id = $1`,
          [row.id, meta.width, meta.height, meta.blurDataUrl],
        );
        console.log(
          `  ${row.path}: ${meta.width}x${meta.height}, blur ${meta.blurDataUrl.length} chars`,
        );
      } catch (error) {
        failed++;
        console.log(`  ${row.path}: FAILED (${error instanceof Error ? error.message : error})`);
      }
    }
    if (apply && failed === 0) {
      await db.query("COMMIT");
      console.log(`Applied ${rows.length} update(s).`);
    } else {
      await db.query("ROLLBACK");
      console.log(
        apply
          ? `Rolled back: ${failed} image(s) failed.`
          : "Dry run: rolled back. Use --apply to write.",
      );
    }
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    await db.end();
  }
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1]?.endsWith("backfill-media-meta.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
