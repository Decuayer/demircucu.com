import { getImageProps } from "next/image";
import { mediaPathFromUrl } from "@/lib/media/url";

/**
 * Render-time pass over sanitised HTML (README, blog posts, bios): every `<img>` gets
 * `loading="lazy"` and `decoding="async"`; images from our media bucket with known dimensions
 * also get `width`/`height` (no layout shift) and an optimizer `srcset` (AVIF/WebP at the
 * displayed size) instead of the stored original.
 *
 * Runs on HTML the sanitizer produced, so attributes are double-quoted and entity-escaped.
 */
export interface KnownSize {
  width: number | null;
  height: number | null;
}

/** Content column of README and blog pages (max-w-4xl) or the full viewport on phones. */
export const CONTENT_IMAGE_SIZES = "(min-width: 896px) 832px, 100vw";

const IMG_TAG = /<img\b([^>]*?)\/?>/gi;
const ATTR = /([^\s=/]+)(?:\s*=\s*"([^"]*)")?/g;

const escape = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const unescape = (value: string) =>
  value
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

function parseAttributes(source: string): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const match of source.matchAll(ATTR)) {
    attrs.set(match[1]!.toLowerCase(), unescape(match[2] ?? ""));
  }
  return attrs;
}

function serialize(attrs: Map<string, string>): string {
  const parts = [...attrs].map(([name, value]) => `${name}="${escape(value)}"`);
  return `<img ${parts.join(" ")}>`;
}

function positiveInt(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export function optimizeHtmlImages(
  html: string,
  sizes: ReadonlyMap<string, KnownSize>,
  options: { baseUrl?: string; sizesAttr?: string } = {},
): string {
  const sizesAttr = options.sizesAttr ?? CONTENT_IMAGE_SIZES;
  return html.replace(IMG_TAG, (tag, rawAttrs: string) => {
    const attrs = parseAttributes(rawAttrs);
    const src = attrs.get("src") ?? "";
    if (!attrs.has("loading")) attrs.set("loading", "lazy");
    attrs.set("decoding", "async");

    const path = src ? mediaPathFromUrl(src, options.baseUrl) : null;
    const known = path ? sizes.get(path) : undefined;
    if (!known?.width || !known.height) return attrs.size ? serialize(attrs) : tag;

    // A width the author set (README `width="120"`) is the display size: a fixed 1x/2x srcset.
    // Otherwise the image fills the content column: a responsive srcset with `sizes`.
    const authorWidth = positiveInt(attrs.get("width"));
    const fixed = authorWidth !== null && authorWidth < known.width;
    const width = fixed ? authorWidth : known.width;
    const height = fixed
      ? (positiveInt(attrs.get("height")) ?? Math.round((known.height * authorWidth) / known.width))
      : known.height;

    const { props } = getImageProps({
      src,
      alt: attrs.get("alt") ?? "",
      width,
      height,
      ...(fixed ? {} : { sizes: sizesAttr }),
    });
    attrs.set("src", props.src);
    if (props.srcSet) attrs.set("srcset", props.srcSet);
    if (props.sizes) attrs.set("sizes", props.sizes);
    else attrs.delete("sizes");
    attrs.set("width", String(width));
    attrs.set("height", String(height));
    return serialize(attrs);
  });
}
