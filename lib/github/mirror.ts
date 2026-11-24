/**
 * Media mirror (task 1.3): downloads README images and repository PDFs into the `media` bucket
 * and the media library (`MediaFile`, source GITHUB).
 *
 *   download (https only, size-capped) -> verify type from the bytes -> sha256 of the original
 *   -> reuse the MediaFile with the same hash, or optimise (sharp) and upload to
 *   `github/<repo>/<hash>.<ext>` -> MediaFile row.
 *
 * Approved limits: images 10 MB, PDFs 25 MB (original size). Larger or unusable files are not
 * mirrored; the README links to the original instead.
 *
 * SVG is rasterised to PNG: the bucket serves files from a public origin and an SVG opened
 * directly could run scripts. Animated GIFs are stored unchanged to keep the animation.
 */
import { createHash } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import type { PrismaClient } from "@prisma/client";
import { USER_AGENT, type FetchLike } from "./auth";

const MB = 1024 * 1024;

export const MIRROR_LIMITS = { image: 10 * MB, document: 25 * MB } as const;

/** Longest edge kept for mirrored images; larger ones are scaled down. */
export const MAX_IMAGE_EDGE = 2400;

const IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

type ImageMime = keyof typeof IMAGE_TYPES;

export type DownloadResult =
  | { ok: true; bytes: Buffer; contentType: string | null; finalUrl: string }
  | { ok: false; reason: "tooLarge" | "httpError" | "network" | "insecure" };

/** GET with redirects, a timeout and a byte cap enforced while streaming. */
export async function download(
  url: string,
  maxBytes: number,
  doFetch: FetchLike = fetch,
): Promise<DownloadResult> {
  if (!url.startsWith("https://")) return { ok: false, reason: "insecure" };
  let response: Response;
  try {
    response = await doFetch(url, {
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return { ok: false, reason: "network" };
  }
  if (response.url && !response.url.startsWith("https://"))
    return { ok: false, reason: "insecure" };
  if (!response.ok || !response.body) return { ok: false, reason: "httpError" };
  const declared = Number(response.headers.get("content-length"));
  if (declared > maxBytes) {
    await response.body.cancel();
    return { ok: false, reason: "tooLarge" };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "tooLarge" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "network" };
  }
  return {
    ok: true,
    bytes: Buffer.concat(chunks),
    contentType: response.headers.get("content-type"),
    finalUrl: response.url || url,
  };
}

export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function looksLikeSvg(bytes: Buffer, contentType: string | null): boolean {
  if (contentType?.includes("image/svg+xml")) return true;
  const head = bytes
    .subarray(0, 1024)
    .toString("utf8")
    .replace(/<\?xml[^>]*>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>/gi, "")
    .trimStart();
  return head.startsWith("<svg");
}

export interface PreparedImage {
  bytes: Buffer;
  mime: ImageMime;
  ext: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
}

export type PrepareResult =
  { ok: true; image: PreparedImage } | { ok: false; reason: "unsupportedType" | "invalidImage" };

async function blurOf(input: Buffer): Promise<string | null> {
  try {
    const tiny = await sharp(input, { animated: false })
      .resize(16, 16, { fit: "inside" })
      .webp({ quality: 40 })
      .toBuffer();
    return `data:image/webp;base64,${tiny.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Verifies and optimises downloaded image bytes. */
export async function prepareImage(
  bytes: Buffer,
  contentType: string | null,
): Promise<PrepareResult> {
  try {
    if (looksLikeSvg(bytes, contentType)) {
      // Rasterised at 2x so diagrams stay sharp on high-density screens.
      const png = await sharp(bytes, { density: 144 })
        .resize(MAX_IMAGE_EDGE, MAX_IMAGE_EDGE, { fit: "inside", withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer({ resolveWithObject: true });
      return {
        ok: true,
        image: {
          bytes: png.data,
          mime: "image/png",
          ext: "png",
          // Displayed at the SVG's own size (half the 2x raster).
          width: Math.round(png.info.width / 2) || null,
          height: Math.round(png.info.height / 2) || null,
          blurDataUrl: await blurOf(png.data),
        },
      };
    }

    const detected = await fileTypeFromBuffer(bytes);
    if (!detected || !(detected.mime in IMAGE_TYPES))
      return { ok: false, reason: "unsupportedType" };
    const mime = detected.mime as ImageMime;
    const meta = await sharp(bytes, { animated: true }).metadata();
    const width = meta.width ?? null;
    const height = meta.pageHeight ?? meta.height ?? null;
    const animated = (meta.pages ?? 1) > 1;

    let output = bytes;
    let outWidth = width;
    let outHeight = height;
    if (!animated && mime !== "image/gif") {
      const oversized = (width ?? 0) > MAX_IMAGE_EDGE || (height ?? 0) > MAX_IMAGE_EDGE;
      let pipeline = sharp(bytes).rotate();
      if (oversized) pipeline = pipeline.resize(MAX_IMAGE_EDGE, MAX_IMAGE_EDGE, { fit: "inside" });
      switch (mime) {
        case "image/png":
          pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
          break;
        case "image/jpeg":
          pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
          break;
        case "image/webp":
          pipeline = pipeline.webp({ quality: 82 });
          break;
        case "image/avif":
          pipeline = pipeline.avif({ quality: 55 });
          break;
      }
      const result = await pipeline.toBuffer({ resolveWithObject: true });
      if (oversized || result.data.length < bytes.length) {
        output = result.data;
        outWidth = result.info.width;
        outHeight = result.info.height;
      }
    }
    return {
      ok: true,
      image: {
        bytes: output,
        mime,
        ext: IMAGE_TYPES[mime],
        width: outWidth,
        height: outHeight,
        blurDataUrl: await blurOf(output),
      },
    };
  } catch {
    return { ok: false, reason: "invalidImage" };
  }
}

export function isPdf(bytes: Uint8Array): boolean {
  return Buffer.from(bytes.subarray(0, 5)).toString("latin1") === "%PDF-";
}

export interface ObjectStore {
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
}

export interface MirroredFile {
  id: string;
  path: string;
  width: number | null;
  height: number | null;
}

export type MirrorFailure = "tooLarge" | "unsupportedType" | "invalidImage" | "downloadFailed";

export type MirrorResult = { ok: true; file: MirroredFile } | { ok: false; reason: MirrorFailure };

export interface MirrorStats {
  downloaded: number;
  reused: number;
  uploaded: number;
  skipped: number;
}

type Db = Pick<PrismaClient, "mediaFile">;

const fileSelect = { id: true, path: true, width: true, height: true } as const;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002"
  );
}

/** Mirrors files of one repository. Every method is idempotent (content-addressed). */
export class RepoMirror {
  readonly stats: MirrorStats = { downloaded: 0, reused: 0, uploaded: 0, skipped: 0 };

  constructor(
    private readonly db: Db,
    private readonly store: ObjectStore,
    private readonly repoFullName: string,
    private readonly doFetch: FetchLike = fetch,
  ) {}

  private folder(): string {
    const name = this.repoFullName.split("/").pop() ?? "repo";
    return `github/${name.replace(/[^A-Za-z0-9._-]/g, "-")}`;
  }

  private async save(
    hash: string,
    file: {
      bytes: Buffer;
      mime: string;
      ext: string;
      width?: number | null;
      height?: number | null;
      blurDataUrl?: string | null;
    },
    originUrl: string,
    name: string,
  ): Promise<MirroredFile> {
    const path = `${this.folder()}/${hash}.${file.ext}`;
    await this.store.put(path, file.bytes, file.mime);
    this.stats.uploaded++;
    try {
      return await this.db.mediaFile.create({
        data: {
          name,
          type: file.mime,
          size: file.bytes.length,
          path,
          source: "GITHUB",
          originUrl,
          repoFullName: this.repoFullName,
          contentHash: hash,
          width: file.width ?? null,
          height: file.height ?? null,
          blurDataUrl: file.blurDataUrl ?? null,
        },
        select: fileSelect,
      });
    } catch (error) {
      // A concurrent sync stored the same content first.
      if (!isUniqueViolation(error)) throw error;
      return this.db.mediaFile.findFirstOrThrow({
        where: { OR: [{ contentHash: hash }, { path }] },
        select: fileSelect,
      });
    }
  }

  private async existing(hash: string): Promise<MirroredFile | null> {
    const found = await this.db.mediaFile.findUnique({
      where: { contentHash: hash },
      select: fileSelect,
    });
    if (found) this.stats.reused++;
    return found;
  }

  async image(url: string): Promise<MirrorResult> {
    const downloaded = await download(url, MIRROR_LIMITS.image, this.doFetch);
    if (!downloaded.ok) {
      this.stats.skipped++;
      return {
        ok: false,
        reason: downloaded.reason === "tooLarge" ? "tooLarge" : "downloadFailed",
      };
    }
    this.stats.downloaded++;
    const hash = sha256(downloaded.bytes);
    const known = await this.existing(hash);
    if (known) return { ok: true, file: known };

    const prepared = await prepareImage(downloaded.bytes, downloaded.contentType);
    if (!prepared.ok) {
      this.stats.skipped++;
      return { ok: false, reason: prepared.reason };
    }
    const name = decodeURIComponent(new URL(url).pathname.split("/").pop() || "image");
    return { ok: true, file: await this.save(hash, prepared.image, url, name) };
  }

  async document(url: string, name: string): Promise<MirrorResult> {
    const downloaded = await download(url, MIRROR_LIMITS.document, this.doFetch);
    if (!downloaded.ok) {
      this.stats.skipped++;
      return {
        ok: false,
        reason: downloaded.reason === "tooLarge" ? "tooLarge" : "downloadFailed",
      };
    }
    this.stats.downloaded++;
    if (!isPdf(downloaded.bytes)) {
      this.stats.skipped++;
      return { ok: false, reason: "unsupportedType" };
    }
    const hash = sha256(downloaded.bytes);
    const known = await this.existing(hash);
    if (known) return { ok: true, file: known };
    return {
      ok: true,
      file: await this.save(
        hash,
        { bytes: downloaded.bytes, mime: "application/pdf", ext: "pdf" },
        url,
        name,
      ),
    };
  }
}
