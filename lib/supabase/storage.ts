import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { INCOMING_FOLDER } from "@/lib/upload/policy";

let adminClient: SupabaseClient | undefined;

/**
 * Supabase client with the secret key. Server-only; used for Storage uploads and deletes.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` holds either a legacy `service_role` JWT or a new `sb_secret_...`
 * key; supabase-js accepts both. Created on first use so builds and pages that never upload do
 * not need the secret.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "Supabase storage is not configured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }
  adminClient = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

/** Public bucket; created once per environment (see docs/security-review.md, S6). */
export const BUCKET_NAME = "media";

/** Stored files never change (random or content-hash names), so browsers and the CDN may cache them for a year. */
const IMMUTABLE_CACHE_SECONDS = "31536000";

export async function deleteFileFromStorage(
  path: string,
): Promise<{ success: true } | { success: false; error: "storageUnavailable" }> {
  try {
    const { error } = await getSupabaseAdmin().storage.from(BUCKET_NAME).remove([path]);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("[storage] delete failed:", (error as Error).message);
    return { success: false, error: "storageUnavailable" };
  }
}

/**
 * Stores bytes at a fixed, content-addressed path (GitHub mirror: `github/<repo>/<sha256>.<ext>`).
 * Overwriting is harmless because the same path always holds the same content, and it lets a
 * sync that failed between upload and database write finish on the next run.
 */
export async function putObject(
  path: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .storage.from(BUCKET_NAME)
    .upload(path, bytes, { contentType, cacheControl: IMMUTABLE_CACHE_SECONDS, upsert: true });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
}

/** One-time upload URL for `incoming/<uuid>` (valid two hours, no overwrite). */
export async function createIncomingUpload(): Promise<
  { ok: true; path: string; signedUrl: string } | { ok: false }
> {
  try {
    const path = `${INCOMING_FOLDER}/${randomUUID()}`;
    const { data, error } = await getSupabaseAdmin()
      .storage.from(BUCKET_NAME)
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { ok: true, path, signedUrl: data.signedUrl };
  } catch (error) {
    console.error("[storage] signed upload failed:", (error as Error).message);
    return { ok: false };
  }
}

/** Reads an object that may be at most `maxBytes` long. */
export async function downloadObject(
  path: string,
  maxBytes: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; reason: "missing" | "tooLarge" }> {
  const { data, error } = await getSupabaseAdmin().storage.from(BUCKET_NAME).download(path);
  if (error || !data) return { ok: false, reason: "missing" };
  if (data.size > maxBytes) return { ok: false, reason: "tooLarge" };
  return { ok: true, bytes: new Uint8Array(await data.arrayBuffer()) };
}

/** Removes abandoned signed uploads older than `maxAgeMs` (best effort). */
export async function purgeStaleIncoming(maxAgeMs: number, now = Date.now()): Promise<number> {
  const storage = getSupabaseAdmin().storage.from(BUCKET_NAME);
  const { data, error } = await storage.list(INCOMING_FOLDER, { limit: 100 });
  if (error || !data) return 0;
  const stale = data
    .filter((o) => o.created_at && now - Date.parse(o.created_at) > maxAgeMs)
    .map((o) => `${INCOMING_FOLDER}/${o.name}`);
  if (stale.length === 0) return 0;
  const { error: removeError } = await storage.remove(stale);
  return removeError ? 0 : stale.length;
}
