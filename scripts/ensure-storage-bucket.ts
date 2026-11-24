/**
 * Creates (or aligns) the public `media` bucket with the upload policy as a second layer:
 * Storage itself rejects other MIME types and files above 4 MB.
 *   (set -a; . ./.env.staging.local; set +a; npx tsx scripts/ensure-storage-bucket.ts)
 * Pass --apply to change an existing bucket; without it existing buckets are only reported.
 */
import { createClient } from "@supabase/supabase-js";
import { MAX_UPLOAD_BYTES, UPLOAD_TYPES } from "../lib/upload/policy";

const BUCKET = "media";

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const storage = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).storage;
  const options = {
    public: true,
    fileSizeLimit: MAX_UPLOAD_BYTES,
    allowedMimeTypes: Object.keys(UPLOAD_TYPES),
  };

  const { data: existing } = await storage.getBucket(BUCKET);
  if (!existing) {
    const { error } = await storage.createBucket(BUCKET, options);
    if (error) throw new Error(`create failed: ${error.message}`);
    console.log(`created bucket "${BUCKET}"`, options);
    return;
  }
  console.log(`bucket "${BUCKET}" exists`, {
    public: existing.public,
    fileSizeLimit: existing.file_size_limit,
    allowedMimeTypes: existing.allowed_mime_types,
  });
  if (process.argv.includes("--apply")) {
    const { error } = await storage.updateBucket(BUCKET, options);
    if (error) throw new Error(`update failed: ${error.message}`);
    console.log("updated to", options);
  }
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
