"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { invalidate } from "@/lib/cache/tags";
import { deleteFileFromStorage } from "@/lib/supabase/storage";
import { fail, ok, toActionFailure, type ActionResult } from "@/lib/actions/result";
import { id as idSchema } from "@/lib/validation/common";

export async function deleteMediaFile(idInput: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    const file = await prisma.mediaFile.findUnique({ where: { id } });
    if (!file) return fail("notFound");

    const storage = await deleteFileFromStorage(file.path);
    if (!storage.success) {
      // Keep the row so the file stays visible and the delete can be retried.
      console.error("[action:deleteMediaFile] storage delete failed");
      return fail("serverError");
    }
    await prisma.mediaFile.delete({ where: { id } });
    invalidate({ entity: "media" });
    return ok();
  } catch (error) {
    return toActionFailure(error, "deleteMediaFile");
  }
}
