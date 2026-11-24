import type { UPLOAD_FOLDERS } from "@/lib/upload/policy";

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export type ClientUploadResult = { ok: true; path: string } | { ok: false; error: string };

/** Uploads one file through `POST /api/upload`; returns the storage path or an error code. */
export async function uploadToMediaLibrary(
  file: File,
  folder: UploadFolder,
): Promise<ClientUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  try {
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const data = (await response.json().catch(() => ({}))) as { path?: unknown; error?: unknown };
    if (response.ok && typeof data.path === "string") return { ok: true, path: data.path };
    return { ok: false, error: typeof data.error === "string" ? data.error : "serverError" };
  } catch {
    return { ok: false, error: "serverError" };
  }
}
