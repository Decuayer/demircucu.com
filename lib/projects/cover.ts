/**
 * Project cover for cards: the admin's image (the project form's cover field), else the first
 * real image of the README (badges skipped), else none (the card shows a neutral placeholder).
 * Small or square images (logos) are shown whole ("contain"); screenshots fill the frame.
 */

export interface CoverMedia {
  path: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
}

export type CoverFit = "contain" | "cover";

/** Storage path of the README's first non-badge image, if it is one of our mirrored files. */
export function firstReadmeImagePath(
  html: string | null | undefined,
  toPath: (url: string) => string | null,
): string | null {
  if (!html) return null;
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = match[0];
    if (/\bclass="[^"]*\breadme-badge\b/.test(tag)) continue;
    const src = /\bsrc="([^"]+)"/.exec(tag)?.[1];
    const path = src ? toPath(src.replaceAll("&amp;", "&")) : null;
    if (path) return path;
  }
  return null;
}

const LOGO_MAX_WIDTH = 640;

export function coverFit(width: number | null, height: number | null): CoverFit {
  if (!width || !height) return "contain";
  const ratio = width / height;
  return width < LOGO_MAX_WIDTH || (ratio > 0.75 && ratio < 1.34) ? "contain" : "cover";
}

export interface ProjectCover {
  path: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  fit: CoverFit;
  source: "admin" | "readme";
}

export function pickCover(
  adminPath: string | null,
  readmePath: string | null,
  media: ReadonlyMap<string, CoverMedia>,
): ProjectCover | null {
  for (const [path, source] of [
    [adminPath, "admin"],
    [readmePath, "readme"],
  ] as const) {
    if (!path) continue;
    const file = media.get(path);
    if (!file) continue;
    return { ...file, fit: coverFit(file.width, file.height), source };
  }
  return null;
}
