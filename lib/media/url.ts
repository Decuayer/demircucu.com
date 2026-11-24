/**
 * Media references are stored as storage paths inside the public `media` bucket
 * ("projects/<uuid>.png"); the public URL is derived here, so rows stay valid when the Supabase
 * project or host changes and staging data can be copied from production. Client-safe.
 */
export const MEDIA_BUCKET = "media";

const PUBLIC_OBJECT_PREFIX = `/storage/v1/object/public/${MEDIA_BUCKET}/`;

/** Storage path: folder segments of [A-Za-z0-9._-], no "." / ".." segments, no leading slash. */
export const MEDIA_PATH_PATTERN = /^(?!.*(?:^|\/)\.{1,2}(?:\/|$))[a-z0-9-]+(?:\/[A-Za-z0-9._-]+)+$/;

export function isMediaPath(value: string): boolean {
  return value.length <= 512 && MEDIA_PATH_PATTERN.test(value);
}

function supabaseOrigin(baseUrl: string | undefined): string | null {
  if (!baseUrl) return null;
  try {
    return new URL(baseUrl).origin;
  } catch {
    return null;
  }
}

/** Public URL of a stored object, or null for an empty path or a missing configuration. */
export function mediaUrl(
  path: string | null | undefined,
  baseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  if (!path) return null;
  const origin = supabaseOrigin(baseUrl);
  if (!origin) return null;
  return `${origin}${PUBLIC_OBJECT_PREFIX}${path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Storage path of a public URL of the media bucket on the configured Supabase project, or null
 * for any other URL. Used to find media references inside rich text.
 */
export function mediaPathFromUrl(
  url: string,
  baseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  const origin = supabaseOrigin(baseUrl);
  if (!origin) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.origin !== origin || !parsed.pathname.startsWith(PUBLIC_OBJECT_PREFIX)) return null;
  let path: string;
  try {
    path = decodeURIComponent(parsed.pathname.slice(PUBLIC_OBJECT_PREFIX.length));
  } catch {
    return null;
  }
  return isMediaPath(path) ? path : null;
}

/** Storage paths of own-bucket images referenced by `<img src>` in sanitised HTML. */
export function mediaPathsInHtml(
  html: string | null | undefined,
  baseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string[] {
  if (!html) return [];
  const paths = new Set<string>();
  for (const match of html.matchAll(/<img\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const src = (match[1] ?? match[2] ?? "").replaceAll("&amp;", "&");
    const path = mediaPathFromUrl(src, baseUrl);
    if (path) paths.add(path);
  }
  return [...paths];
}
