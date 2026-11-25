/**
 * Aligns the public `media` bucket with the upload policy as a second layer: Storage itself
 * rejects other MIME types and files above 25 MB (PDF limit of uploads and the GitHub mirror;
 * images are capped at 10 MB by app/api/upload).
 *   (set -a; . ./.env.staging.local; set +a; npx tsx scripts/ensure-storage-bucket.ts)
 *
 * Dry-run by default: reports the bucket settings, the planned change and every existing object
 * that would not pass the new policy. Nothing is created or changed without --apply.
 * Bucket limits only apply to new uploads; existing objects are never removed or rewritten.
 */
import { createClient } from "@supabase/supabase-js";
import {
  BUCKET_FILE_SIZE_LIMIT,
  MIRROR_LIMITS,
  UPLOAD_TYPES,
  type AllowedMime,
} from "../lib/upload/policy";

const BUCKET = "media";
const PAGE = 1000;

type StorageApi = ReturnType<typeof createClient>["storage"];
type ObjectInfo = { path: string; mime: string | undefined; size: number };

async function listObjects(storage: StorageApi, prefix = ""): Promise<ObjectInfo[]> {
  const out: ObjectInfo[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await storage.from(BUCKET).list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`list failed: ${error.message}`);
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders have no id; recurse into them.
      if (!entry.id) out.push(...(await listObjects(storage, path)));
      else
        out.push({
          path,
          mime: entry.metadata?.mimetype as string | undefined,
          size: Number(entry.metadata?.size ?? 0),
        });
    }
    if (data.length < PAGE) return out;
  }
}

function violation(object: ObjectInfo): string | null {
  if (!object.mime || !(object.mime in UPLOAD_TYPES)) return `type ${object.mime ?? "unknown"}`;
  const rule = UPLOAD_TYPES[object.mime as AllowedMime];
  // GitHub mirrors (github/<repo>/...) have their own, larger limits.
  const max = object.path.startsWith("github/")
    ? rule.kind === "document"
      ? MIRROR_LIMITS.document
      : MIRROR_LIMITS.image
    : rule.maxBytes;
  if (object.size > max) return `size ${object.size} > ${max}`;
  return null;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const storage = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).storage;
  const options = {
    public: true,
    fileSizeLimit: BUCKET_FILE_SIZE_LIMIT,
    allowedMimeTypes: Object.keys(UPLOAD_TYPES),
  };
  console.log(apply ? "mode: APPLY" : "mode: dry-run (pass --apply to change)");
  console.log("target", options);

  const { data: existing } = await storage.getBucket(BUCKET);
  if (!existing) {
    console.log(`bucket "${BUCKET}" does not exist`);
    if (!apply) return console.log(`would create bucket "${BUCKET}"`);
    const { error } = await storage.createBucket(BUCKET, options);
    if (error) throw new Error(`create failed: ${error.message}`);
    return console.log(`created bucket "${BUCKET}"`);
  }
  console.log("current", {
    public: existing.public,
    fileSizeLimit: existing.file_size_limit,
    allowedMimeTypes: existing.allowed_mime_types,
  });

  const objects = await listObjects(storage);
  const byType = new Map<string, number>();
  for (const o of objects)
    byType.set(o.mime ?? "unknown", (byType.get(o.mime ?? "unknown") ?? 0) + 1);
  const bad = objects.flatMap((o) => {
    const reason = violation(o);
    return reason ? [{ path: o.path, reason }] : [];
  });
  console.log(`objects: ${objects.length}`, Object.fromEntries(byType));
  console.log(`largest: ${Math.max(0, ...objects.map((o) => o.size))} bytes`);
  console.log(`outside the new policy: ${bad.length}`);
  for (const b of bad) console.log(`  - ${b.path}: ${b.reason}`);

  if (!apply)
    return console.log(`would update bucket "${BUCKET}" to target (existing objects untouched)`);
  const { error } = await storage.updateBucket(BUCKET, options);
  if (error) throw new Error(`update failed: ${error.message}`);
  console.log("updated to target");
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
