"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import { deleteFileFromStorage } from "@/lib/supabase/storage";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";


// Middleware to check admin rights inside server actions
async function requireAdmin() {
  const t = await getTranslations("media");

  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error(t("unauthorized"));
  }
  return user;
}

/**
 * Get all media files
 */
export async function getMediaFiles(typeFilter?: string) {
  try {
    await requireAdmin();
    
    const whereClause = typeFilter ? {
      type: {
        startsWith: typeFilter
      }
    } : {};

    return await prisma.mediaFile.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });
  } catch (error: any) {
    console.error("Error fetching media files:", error);
    return [];
  }
}

/**
 * Delete a media file from DB and Storage
 */
export async function deleteMediaFile(id: string) {
  const t = await getTranslations("media");

  try {
    await requireAdmin();
    
    // Find the file to get its path
    const file = await prisma.mediaFile.findUnique({ where: { id } });
    if (!file) {
      return { error: t("fileNotFound") };
    }
    
    // Delete from Supabase Storage
    const storageRes = await deleteFileFromStorage(file.path);
    if (!storageRes.success) {
      // We might still want to delete from DB if it's already gone from storage,
      // but let's log the error
      console.warn("Could not delete from storage, but deleting from DB anyway:", storageRes.error);
    }
    
    // Delete from Database
    await prisma.mediaFile.delete({ where: { id } });
    
    revalidatePath("/admin/media");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting media file:", error);
    return { error: error.message || t("deleteError") };
  }
}

/**
 * Save file details to Database
 */
export async function saveMediaFileToDB(data: {
  name: string;
  url: string;
  type: string;
  size: number;
  bucket: string;
  path: string;
  usedIn?: string;
}) {
  const t = await getTranslations("media");
  
  try {
    await requireAdmin();
    
    const mediaFile = await prisma.mediaFile.create({
      data: {
        name: data.name,
        url: data.url,
        type: data.type,
        size: data.size,
        bucket: data.bucket,
        path: data.path,
        usedIn: data.usedIn,
      }
    });
    
    revalidatePath("/admin/media");
    return { success: true, mediaFile };
  } catch (error: any) {
    console.error("Error saving media file to DB:", error);
    return { error: error.message || t("saveError") };
  }
}
