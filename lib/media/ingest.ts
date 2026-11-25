import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { prepareImage } from "@/lib/media/image";
import { evaluateUpload, type UploadRejection, type UPLOAD_FOLDERS } from "@/lib/upload/policy";
import { fileTypeFromBuffer } from "file-type";

/**
 * Turns an uploaded file into a media library entry:
 *
 *   detect type from the bytes -> policy -> images: strip metadata, cap size, measure, blur
 *   -> sha256 of the original -> reuse the entry with the same content, or store it at
 *   `<folder>/<sha256>.<ext>` (immutable, cacheable for a year) -> MediaFile row.
 */
export interface IngestStore {
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  remove(path: string): Promise<unknown>;
}

export const ingestSelect = {
  id: true,
  name: true,
  type: true,
  size: true,
  path: true,
  width: true,
  height: true,
  createdAt: true,
} as const;

export type IngestedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  width: number | null;
  height: number | null;
  createdAt: Date;
};

export type IngestResult =
  | { ok: true; file: IngestedFile; reused: boolean }
  | { ok: false; reason: UploadRejection | "invalidImage" };

type Db = Pick<PrismaClient, "mediaFile">;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002"
  );
}

export async function ingestUpload(
  input: { bytes: Uint8Array; name: string; folder: (typeof UPLOAD_FOLDERS)[number] },
  deps: { db: Db; store: IngestStore; bucket: string },
): Promise<IngestResult> {
  const detected = await fileTypeFromBuffer(input.bytes);
  const decision = evaluateUpload(detected?.mime, input.bytes.byteLength);
  if (!decision.ok) return decision;

  const contentHash = createHash("sha256").update(input.bytes).digest("hex");
  const existing = await deps.db.mediaFile.findUnique({
    where: { contentHash },
    select: ingestSelect,
  });
  if (existing) return { ok: true, file: existing, reused: true };

  let bytes: Uint8Array = input.bytes;
  let meta: { width: number | null; height: number | null; blurDataUrl: string | null } = {
    width: null,
    height: null,
    blurDataUrl: null,
  };
  if (decision.kind === "image") {
    const prepared = await prepareImage(Buffer.from(input.bytes), decision.mime);
    if (!prepared.ok) return { ok: false, reason: "invalidImage" };
    bytes = prepared.image.bytes;
    meta = {
      width: prepared.image.width,
      height: prepared.image.height,
      blurDataUrl: prepared.image.blurDataUrl,
    };
  }

  const path = `${input.folder}/${contentHash}.${decision.ext}`;
  await deps.store.put(path, bytes, decision.mime);
  try {
    const file = await deps.db.mediaFile.create({
      data: {
        name: input.name,
        type: decision.mime,
        size: bytes.byteLength,
        bucket: deps.bucket,
        path,
        source: "UPLOAD",
        contentHash,
        ...meta,
      },
      select: ingestSelect,
    });
    return { ok: true, file, reused: false };
  } catch (error) {
    // A concurrent upload of the same content won the insert; use its row.
    if (isUniqueViolation(error)) {
      const winner = await deps.db.mediaFile.findUnique({
        where: { contentHash },
        select: ingestSelect,
      });
      if (winner) {
        if (winner.path !== path) await deps.store.remove(path);
        return { ok: true, file: winner, reused: true };
      }
    }
    await deps.store.remove(path);
    throw error;
  }
}
