import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { AuthorizationError } from "@/lib/auth/errors";
import { isSameOrigin } from "@/lib/http/same-origin";
import { prisma } from "@/lib/prisma";
import { ingestUpload } from "@/lib/media/ingest";
import { cleanDisplayName, completeRequestSchema, MAX_UPLOAD_BYTES } from "@/lib/upload/policy";
import {
  BUCKET_NAME,
  deleteFileFromStorage,
  downloadObject,
  putObject,
} from "@/lib/supabase/storage";

/** Large PDFs and image processing; well inside the Hobby limit. */
export const maxDuration = 60;

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

/**
 * Step 2 of an upload (step 1: `POST /api/upload/sign`). The object the browser put into
 * `incoming/` is verified from its bytes, processed and stored under a content-hash name; the
 * incoming object is always removed.
 */
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

  const parsed = completeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("invalidInput", 400);
  const { path: incoming, folder } = parsed.data;

  try {
    const download = await downloadObject(incoming, MAX_UPLOAD_BYTES);
    if (!download.ok) {
      return download.reason === "tooLarge" ? error("tooLarge", 413) : error("invalidInput", 400);
    }
    const bytes = download.bytes;

    const result = await ingestUpload(
      { bytes, folder, name: cleanDisplayName(parsed.data.name) },
      {
        db: prisma,
        bucket: BUCKET_NAME,
        store: { put: putObject, remove: deleteFileFromStorage },
      },
    );
    if (!result.ok) {
      const reason = result.reason === "invalidImage" ? "unsupportedType" : result.reason;
      return error(reason, reason === "tooLarge" ? 413 : 415);
    }
    return NextResponse.json({ success: true, path: result.file.path, file: result.file });
  } catch (failure) {
    console.error("[api/upload]", failure);
    return error("serverError", 500);
  } finally {
    await deleteFileFromStorage(incoming);
  }
}
