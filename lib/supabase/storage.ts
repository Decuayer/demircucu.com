import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Create a Supabase client with the service role key for admin privileges
// We use the service role key to bypass RLS for server-side uploads
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
  folder: string = "general"
) {
  try {
    // Ensure bucket exists
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    if (bucketsError) throw bucketsError;

    const bucketExists = buckets.some((b) => b.name === BUCKET_NAME);
    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
      });
      if (createError) throw createError;
    }

    // Generate unique filename to avoid collisions
    const fileExt = fileName.split(".").pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${folder}/${uniqueFileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(data.path);

    return {
      success: true,
      path: data.path,
      publicUrl: urlData.publicUrl,
    };
  } catch (error: any) {
    console.error("Supabase storage upload error:", error);
    return {
      success: false,
      error: error.message || "Failed to upload file to storage",
    };
  }
}

/**
 * Deletes a file from Supabase Storage
 * @param path The storage path of the file to delete
 */
export async function deleteFileFromStorage(path: string) {
  try {
    const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).remove([path]);
    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    console.error("Supabase storage delete error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete file from storage",
    };
  }
}
