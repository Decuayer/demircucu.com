import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { AuthorizationError } from "@/lib/auth/errors";
import { isSameOrigin } from "@/lib/http/same-origin";
import { inspectUpload } from "@/lib/upload/inspect";
import { cleanDisplayName, MAX_UPLOAD_BYTES, uploadFieldsSchema } from "@/lib/upload/policy";
import { BUCKET_NAME, deleteFileFromStorage, uploadFileToStorage } from "@/lib/supabase/storage";
import { saveMediaFile } from "@/lib/data/media";

type UploadErrorCode =
  | "forbidden"
  | "unauthenticated"
  | "invalidInput"
  | "unsupportedType"
  | "tooLarge"
  | "empty"
  | "serverError";

function error(code: UploadErrorCode, status: number) {
  return NextResponse.json({ error: code }, { status });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers)) return error("forbidden", 403);

  try {
    await requireAdmin();
  } catch (failure) {
    if (failure instanceof AuthorizationError) {
      return error(failure.code, failure.code === "unauthenticated" ? 401 : 403);
    }
    throw failure;
  }

  // Reject oversized bodies before buffering them.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) return error("tooLarge", 413);

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return error("invalidInput", 400);

    const fields = uploadFieldsSchema.safeParse({
      folder: form.get("folder") ?? undefined,
      usedIn: form.get("usedIn") || undefined,
      name: cleanDisplayName(file.name),
    });
    if (!fields.success) return error("invalidInput", 400);
    if (file.size > MAX_UPLOAD_BYTES) return error("tooLarge", 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const decision = await inspectUpload(bytes);
    if (!decision.ok) return error(decision.reason, decision.reason === "tooLarge" ? 413 : 415);

    const stored = await uploadFileToStorage(bytes, {
      ext: decision.ext,
      contentType: decision.mime,
      folder: fields.data.folder,
    });
    if (!stored.success) return error("serverError", 502);

    try {
      const mediaFile = await saveMediaFile({
        name: fields.data.name,
        url: stored.publicUrl,
        type: decision.mime,
        size: bytes.byteLength,
        bucket: BUCKET_NAME,
        path: stored.path,
        usedIn: fields.data.usedIn,
      });
      return NextResponse.json({ success: true, url: stored.publicUrl, file: mediaFile });
    } catch (dbError) {
      // Do not leave an untracked object in the bucket.
      await deleteFileFromStorage(stored.path);
      throw dbError;
    }
  } catch (failure) {
    console.error("[api/upload]", failure);
    return error("serverError", 500);
  }
}
