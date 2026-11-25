import type { UPLOAD_FOLDERS } from "@/lib/upload/policy";
import { maxBytesForDeclaredType } from "@/lib/upload/policy";

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export type ClientUploadResult =
  { ok: true; path: string; file: UploadedFile } | { ok: false; error: string };

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: unknown }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: response.ok, data: await response.json().catch(() => ({})) };
}

function errorCode(data: unknown): string {
  const code = (data as { error?: unknown } | null)?.error;
  return typeof code === "string" ? code : "serverError";
}

/**
 * Uploads one file to the media library: a signed URL from `POST /api/upload/sign`, the file
 * straight to Storage (no function body limit), then `POST /api/upload` verifies and stores it.
 */
export async function uploadToMediaLibrary(
  file: File,
  folder: UploadFolder,
): Promise<ClientUploadResult> {
  const limit = maxBytesForDeclaredType(file.type);
  if (limit === null) return { ok: false, error: "unsupportedType" };
  if (file.size === 0) return { ok: false, error: "empty" };
  if (file.size > limit) return { ok: false, error: "tooLarge" };
  try {
    const sign = await postJson("/api/upload/sign", { size: file.size, type: file.type });
    const signed = sign.data as { path?: unknown; signedUrl?: unknown };
    if (!sign.ok || typeof signed.path !== "string" || typeof signed.signedUrl !== "string") {
      return { ok: false, error: errorCode(sign.data) };
    }

    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    const put = await fetch(signed.signedUrl, { method: "PUT", body });
    if (!put.ok) return { ok: false, error: put.status === 413 ? "tooLarge" : "serverError" };

    const done = await postJson("/api/upload", { path: signed.path, folder, name: file.name });
    const result = done.data as { path?: unknown; file?: UploadedFile };
    if (done.ok && typeof result.path === "string" && result.file) {
      return { ok: true, path: result.path, file: result.file };
    }
    return { ok: false, error: errorCode(done.data) };
  } catch {
    return { ok: false, error: "serverError" };
  }
}
