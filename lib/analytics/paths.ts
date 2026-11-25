import { routing } from "@/i18n/routing";

/**
 * Which public route a pathname belongs to. Only these routes are counted; admin, auth and
 * profile pages, unknown paths (404s, probes) and anything with an extension are not.
 */
export type TrackedRoute =
  | { kind: "home" }
  | { kind: "page"; path: StaticPagePath }
  | { kind: "project"; slug: string }
  | { kind: "projectDoc"; slug: string; docId: string }
  | { kind: "blog"; slug: string }
  | { kind: "experience"; id: string }
  | { kind: "skill"; slug: string };

export interface ClassifiedPath {
  locale: string;
  /** The pathname without the locale prefix, always starting with "/" ("/" for home). */
  path: string;
  route: TrackedRoute;
}

export const STATIC_PAGES = [
  "/about",
  "/projects",
  "/blog",
  "/experience",
  "/skills",
  "/contact",
  "/privacy",
] as const;
export type StaticPagePath = (typeof STATIC_PAGES)[number];

const MAX_PATH_LENGTH = 512;
const SEGMENT = /^[A-Za-z0-9._~-]{1,200}$/;

function decode(segment: string): string | null {
  try {
    const value = decodeURIComponent(segment);
    return SEGMENT.test(value) ? value : null;
  } catch {
    return null;
  }
}

/** Classifies a browser pathname such as `/tr/projects/foo`; null when it is not counted. */
export function classifyPath(pathname: string): ClassifiedPath | null {
  if (!pathname.startsWith("/") || pathname.length > MAX_PATH_LENGTH) return null;
  const raw = pathname.split("?")[0]!.split("#")[0]!.replace(/\/+$/, "");
  const parts = raw.split("/").slice(1);
  const [locale, ...rest] = parts;
  if (!locale || !(routing.locales as readonly string[]).includes(locale)) return null;

  const segments: string[] = [];
  for (const part of rest) {
    const value = decode(part);
    if (value === null) return null;
    segments.push(value);
  }
  const path = `/${segments.join("/")}`;
  const route = classifySegments(segments);
  return route ? { locale, path, route } : null;
}

function classifySegments(segments: string[]): TrackedRoute | null {
  const [first, second, third, fourth, ...extra] = segments;
  if (extra.length > 0) return null;
  if (first === undefined) return { kind: "home" };
  if (second === undefined) {
    const path = `/${first}`;
    return (STATIC_PAGES as readonly string[]).includes(path)
      ? { kind: "page", path: path as StaticPagePath }
      : null;
  }
  if (first === "projects") {
    if (third === undefined) return { kind: "project", slug: second };
    if (third === "docs" && fourth !== undefined) {
      return { kind: "projectDoc", slug: second, docId: fourth };
    }
    return null;
  }
  if (third !== undefined) return null;
  if (first === "blog") return { kind: "blog", slug: second };
  if (first === "experience") return { kind: "experience", id: second };
  if (first === "skills") return { kind: "skill", slug: second };
  return null;
}

/** Paths that are never tracked on the client (they never reach `classifyPath` as content). */
export function isUntrackedArea(pathname: string): boolean {
  return /^\/[a-z]{2}\/(admin|auth|profile)(\/|$)/.test(pathname);
}
