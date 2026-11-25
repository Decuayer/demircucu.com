import { z } from "zod";

/**
 * Upload policy (security review S6). The file type is decided from the file's magic bytes,
 * never from the client-supplied name or MIME type. SVG and HTML are not accepted: they can carry
 * scripts and are served from the public storage bucket.
 *
 * Files go straight from the browser to Storage through a signed upload URL (`incoming/`), so
 * the 4.5 MB Vercel request body limit does not apply. The server then verifies and processes the
 * bytes (app/api/upload). Limits match the approved GitHub mirror limits (images 10 MB, PDFs
 * 25 MB).
 */
const MB = 1024 * 1024;

export const UPLOAD_TYPES = {
  "image/png": { ext: "png", kind: "image", maxBytes: 10 * MB },
  "image/jpeg": { ext: "jpg", kind: "image", maxBytes: 10 * MB },
  "image/gif": { ext: "gif", kind: "image", maxBytes: 10 * MB },
  "image/webp": { ext: "webp", kind: "image", maxBytes: 10 * MB },
  "image/avif": { ext: "avif", kind: "image", maxBytes: 10 * MB },
  "image/x-icon": { ext: "ico", kind: "icon", maxBytes: 512 * 1024 },
  "application/pdf": { ext: "pdf", kind: "document", maxBytes: 25 * MB },
} as const;

export type AllowedMime = keyof typeof UPLOAD_TYPES;

export const MAX_UPLOAD_BYTES = Math.max(...Object.values(UPLOAD_TYPES).map((t) => t.maxBytes));

/** Largest image upload (original size, before processing). */
export const MAX_IMAGE_UPLOAD_BYTES = UPLOAD_TYPES["image/png"].maxBytes;

/** Client-side precheck from the browser-reported type; the server decides from the bytes. */
export function maxBytesForDeclaredType(mime: string): number | null {
  return mime in UPLOAD_TYPES ? UPLOAD_TYPES[mime as AllowedMime].maxBytes : null;
}

/** Signed uploads land here (`incoming/<uuid>`) until app/api/upload verifies and moves them. */
export const INCOMING_FOLDER = "incoming";

const INCOMING_PATH = /^incoming\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isIncomingPath(path: unknown): path is string {
  return typeof path === "string" && INCOMING_PATH.test(path);
}

/**
 * GitHub mirror limits (approved Phase 5): original size of README images and repository PDFs.
 * Larger files are not mirrored; the site links to GitHub instead. Mirrors are written by the
 * server (no request body limit), always as one of the UPLOAD_TYPES MIME types.
 */
export const MIRROR_LIMITS = { image: 10 * MB, document: 25 * MB } as const;

/** Storage bucket limit: the largest file either path may store. */
export const BUCKET_FILE_SIZE_LIMIT = Math.max(
  MAX_UPLOAD_BYTES,
  MIRROR_LIMITS.image,
  MIRROR_LIMITS.document,
);

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

/** `POST /api/upload/sign`: the browser asks for a one-time upload URL. */
export const signRequestSchema = z.object({
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  type: z.enum(Object.keys(UPLOAD_TYPES) as [AllowedMime, ...AllowedMime[]]),
});

/** `POST /api/upload`: the uploaded object is verified and added to the media library. */
export const completeRequestSchema = z.object({
  path: z.string().refine(isIncomingPath),
  folder: z.enum(UPLOAD_FOLDERS).default("general"),
  name: z.string().max(1000),
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
