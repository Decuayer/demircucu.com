import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { UPLOAD_FOLDERS } from "@/lib/upload/policy";

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

/** Uploaded files never change (random names), so browsers and the CDN may cache them for a year. */
const IMMUTABLE_CACHE_SECONDS = "31536000";

export type UploadResult =
  | { success: true; path: string; publicUrl: string }
  | { success: false; error: "storageUnavailable" };

/**
 * Stores an already validated file under `<folder>/<uuid>.<ext>`. The object name never uses
 * the client-supplied file name.
 */
export async function uploadFileToStorage(
  file: Uint8Array,
  options: { ext: string; contentType: string; folder: (typeof UPLOAD_FOLDERS)[number] },
): Promise<UploadResult> {
  try {
    const storage = getSupabaseAdmin().storage.from(BUCKET_NAME);
    const path = `${options.folder}/${randomUUID()}.${options.ext}`;
    const { data, error } = await storage.upload(path, file, {
      contentType: options.contentType,
      cacheControl: IMMUTABLE_CACHE_SECONDS,
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = storage.getPublicUrl(data.path);
    return { success: true, path: data.path, publicUrl: urlData.publicUrl };
  } catch (error) {
    console.error("[storage] upload failed:", (error as Error).message);
    return { success: false, error: "storageUnavailable" };
  }
}

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
