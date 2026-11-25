import "server-only";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

/**
 * Image processing shared by uploads (app/api/upload) and the GitHub mirror (lib/github/mirror):
 * the type is verified from the bytes, EXIF/GPS and other metadata are dropped, the longest edge
 * is capped and width, height and a tiny blur placeholder are returned for `next/image`.
 * AVIF/WebP variants are not stored: the image optimizer derives them per request from this
 * normalised original.
 */

/** Longest edge kept for stored images; larger ones are scaled down. */
export const MAX_IMAGE_EDGE = 2400;

const IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

type ImageMime = keyof typeof IMAGE_TYPES;

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
      // sharp drops metadata on re-encode. The original is kept only when it is smaller and
      // carries none (camera photos have EXIF, often with GPS).
      const hasMetadata = Boolean(meta.exif || meta.xmp || meta.iptc);
      if (oversized || hasMetadata || result.data.length < bytes.length) {
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
