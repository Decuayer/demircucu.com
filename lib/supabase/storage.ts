import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { getErrorMessage } from "@/lib/errors";

let adminClient: SupabaseClient | undefined;

/**
 * Supabase client with the service role key (bypasses RLS). Server-only.
 * Created on first use so builds and pages that never upload do not need the secret.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase storage is not configured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }
  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

export const BUCKET_NAME = "media";

/**
 * Uploads a file to Supabase Storage
 * @param file The file to upload as an ArrayBuffer or Buffer
 * @param fileName The original file name
 * @param contentType The MIME type of the file
 * @param folder Optional folder path (e.g., "blog", "projects")
 * @returns Object with path, url, and full publicUrl, or error
 */
export async function uploadFileToStorage(
  file: Buffer | ArrayBuffer,
  fileName: string,
  contentType: string,
  folder: string = "general",
) {
  try {
    // Ensure bucket exists
    const { data: buckets, error: bucketsError } = await getSupabaseAdmin().storage.listBuckets();
    if (bucketsError) throw bucketsError;

    const bucketExists = buckets.some((b) => b.name === BUCKET_NAME);
    if (!bucketExists) {
      const { error: createError } = await getSupabaseAdmin().storage.createBucket(BUCKET_NAME, {
        public: true,
      });
      if (createError) throw createError;
    }

    // Generate unique filename to avoid collisions
    const fileExt = fileName.split(".").pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${folder}/${uniqueFileName}`;

    // Upload to Supabase Storage
    const { data, error } = await getSupabaseAdmin()
      .storage.from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = getSupabaseAdmin().storage.from(BUCKET_NAME).getPublicUrl(data.path);

    return {
      success: true,
      path: data.path,
      publicUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error("Supabase storage upload error:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to upload file to storage"),
    };
  }
}

/**
 * Deletes a file from Supabase Storage
 * @param path The storage path of the file to delete
 */
export async function deleteFileFromStorage(path: string) {
  try {
    const { error } = await getSupabaseAdmin().storage.from(BUCKET_NAME).remove([path]);
    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Supabase storage delete error:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete file from storage"),
    };
  }
}
