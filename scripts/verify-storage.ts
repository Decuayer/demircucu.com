/**
 * Upload, public read and delete round trip against Supabase Storage with the configured secret
 * key, using the same options as lib/supabase/storage.ts. Writes one 1x1 PNG under
 * `media/verification/` and removes it again. Never prints keys or URLs with credentials.
 *   (set -a; . ./.env.staging.local; set +a; npx tsx scripts/verify-storage.ts)
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  console.log(`key format: ${key.startsWith("sb_secret_") ? "sb_secret (new)" : "legacy JWT"}`);

  const storage = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).storage.from("media");
  const path = `verification/${randomUUID()}.png`;

  const upload = await storage.upload(path, PNG, {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) throw new Error(`upload failed: ${upload.error.message}`);
  console.log("upload: ok");

  const publicUrl = storage.getPublicUrl(path).data.publicUrl;
  const read = await fetch(publicUrl);
  console.log(
    `public read: ${read.status} ${read.headers.get("content-type")} cache-control=${read.headers.get("cache-control")}`,
  );

  const removed = await storage.remove([path]);
  if (removed.error) throw new Error(`delete failed: ${removed.error.message}`);
  console.log(`delete: ok (${removed.data.length} object)`);

  const gone = await storage.list("verification", { search: path.split("/")[1] });
  console.log(`listed after delete: ${gone.data?.length ?? "error"}`);
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
