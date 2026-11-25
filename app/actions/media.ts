"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { invalidate } from "@/lib/cache/tags";
import { deleteFileFromStorage } from "@/lib/supabase/storage";
import { fail, ok, toActionFailure, type ActionResult } from "@/lib/actions/result";
import { id as idSchema } from "@/lib/validation/common";

class StorageDeleteError extends Error {}

function isForeignKeyError(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2003"
  );
}

async function isMediaInUse(id: string): Promise<boolean> {
  const file = await prisma.mediaFile.findUniqueOrThrow({
    where: { id },
    select: {
      _count: {
        select: {
          usages: true,
          documents: true,
          projectLogos: true,
          experienceLogos: true,
          blogPostCovers: true,
          settingsAboutPhoto: true,
          settingsFavicon: true,
        },
      },
    },
  });
  return Object.values(file._count).some((n) => n > 0);
}

export async function deleteMediaFile(idInput: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    const file = await prisma.mediaFile.findUnique({ where: { id }, select: { path: true } });
    if (!file) return fail("notFound");
    if (await isMediaInUse(id)) return fail("mediaInUse");

    // The row is deleted first, inside a transaction: the foreign keys (ON DELETE RESTRICT) are
    // the final in-use check, and a failed storage delete rolls the row back, so a file is never
    // removed from storage while content still points to it.
    try {
      await prisma.$transaction(async (tx) => {
        await tx.mediaFile.delete({ where: { id } });
        const storage = await deleteFileFromStorage(file.path);
        if (!storage.success) throw new StorageDeleteError();
      });
    } catch (error) {
      if (error instanceof StorageDeleteError) {
        console.error("[action:deleteMediaFile] storage delete failed");
        return fail("serverError");
      }
      if (isForeignKeyError(error)) return fail("mediaInUse");
      throw error;
    }
    invalidate({ entity: "media" });
    return ok();
  } catch (error) {
    return toActionFailure(error, "deleteMediaFile");
  }
}

export interface LibraryImage {
  id: string;
  name: string;
  path: string;
  width: number | null;
  height: number | null;
}

/** Images of the media library for the rich text editor's picker (newest first). */
export async function listLibraryImages(): Promise<ActionResult<{ images: LibraryImage[] }>> {
  try {
    await requireAdmin();
    const images = await prisma.mediaFile.findMany({
      where: { type: { startsWith: "image/" }, NOT: { type: "image/x-icon" } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, name: true, path: true, width: true, height: true },
    });
    return ok({ images });
  } catch (error) {
    return toActionFailure(error, "listLibraryImages");
  }
}
