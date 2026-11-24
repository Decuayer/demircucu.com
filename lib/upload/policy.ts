import { z } from "zod";

/**
 * Upload policy (security review S6). The file type is decided from the file's magic bytes,
 * never from the client-supplied name or MIME type. SVG and HTML are not accepted: they can carry
 * scripts and are served from the public storage bucket.
 *
 * Vercel functions accept request bodies up to 4.5 MB, so no limit exceeds 4 MB. Larger files
 * need direct-to-storage signed uploads (planned with the media pipeline, Phase 6).
 */
const MB = 1024 * 1024;

export const UPLOAD_TYPES = {
  "image/png": { ext: "png", kind: "image", maxBytes: 4 * MB },
  "image/jpeg": { ext: "jpg", kind: "image", maxBytes: 4 * MB },
  "image/gif": { ext: "gif", kind: "image", maxBytes: 4 * MB },
  "image/webp": { ext: "webp", kind: "image", maxBytes: 4 * MB },
  "image/avif": { ext: "avif", kind: "image", maxBytes: 4 * MB },
  "image/x-icon": { ext: "ico", kind: "icon", maxBytes: 512 * 1024 },
  "application/pdf": { ext: "pdf", kind: "document", maxBytes: 4 * MB },
} as const;

export type AllowedMime = keyof typeof UPLOAD_TYPES;

export const MAX_UPLOAD_BYTES = Math.max(...Object.values(UPLOAD_TYPES).map((t) => t.maxBytes));

export const UPLOAD_FOLDERS = [
  "general",
  "blog",
  "projects",
  "experiences",
  "settings",
  "media-library",
] as const;

export const uploadFieldsSchema = z.object({
  folder: z.enum(UPLOAD_FOLDERS).default("general"),
  name: z.string().trim().min(1).max(200),
});

export type UploadRejection = "unsupportedType" | "tooLarge" | "empty";

export type UploadDecision =
  | { ok: true; mime: AllowedMime; ext: string; kind: string }
  | { ok: false; reason: UploadRejection };

/**
 * Decides whether a file may be stored, from its detected type (magic bytes) and size.
 * `detectedMime` is undefined when the content matched no known signature.
 */
export function evaluateUpload(detectedMime: string | undefined, size: number): UploadDecision {
  if (size <= 0) return { ok: false, reason: "empty" };
  if (!detectedMime || !(detectedMime in UPLOAD_TYPES)) {
    return { ok: false, reason: "unsupportedType" };
  }
  const mime = detectedMime as AllowedMime;
  const rule = UPLOAD_TYPES[mime];
  if (size > rule.maxBytes) return { ok: false, reason: "tooLarge" };
  return { ok: true, mime, ext: rule.ext, kind: rule.kind };
}

/** Display name: base name only, control and path characters removed. */
export function cleanDisplayName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";

  return (
    base
      .replace(/[\u0000-\u001F\u007F<>:"|?*]/g, "")
      .trim()
      .slice(0, 200) || "file"
  );
}
