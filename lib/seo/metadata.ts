import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/**
 * Page metadata for public pages (phase 8 SEO): title and description, the canonical URL in the
 * page language, hreflang alternates (x-default: English), Open Graph and Twitter cards. Paths are
 * locale-less ("/projects/x"); `metadataBase` (root layout) turns them into absolute URLs. Open
 * Graph images come from the `opengraph-image` files of each route segment.
 */

export const X_DEFAULT_LOCALE = "en";
export const OG_LOCALES: Record<string, string> = { tr: "tr_TR", en: "en_US" };

/** "/tr/projects/x" for ("/projects/x", "tr"); the home page is "/tr". */
export function localizedPath(path: string, locale: string): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(routing.locales.map((locale) => [locale, localizedPath(path, locale)])),
    "x-default": localizedPath(path, X_DEFAULT_LOCALE),
  };
}

/** Twitter handle ("@name") from a profile URL in the site settings, if it is one. */
export function twitterHandle(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { hostname, pathname } = new URL(url);
    if (!/(^|\.)(twitter|x)\.com$/.test(hostname)) return undefined;
    const name = pathname.split("/").filter(Boolean)[0];
    return name && /^\w{1,15}$/.test(name) ? `@${name}` : undefined;
  } catch {
    return undefined;
  }
}

/** Plain text for descriptions: no tags, collapsed spaces, cut at a word near `max`. */
export function plainDescription(text: string | null | undefined, max = 160): string | undefined {
  if (!text) return undefined;
  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return undefined;
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

export interface PageMetadataInput {
  locale: string;
  /** Locale-less path of the page. */
  path: string;
  title?: string;
  description?: string | null;
  type?: "website" | "article" | "profile";
  publishedTime?: Date | string | null;
  modifiedTime?: Date | string | null;
  tags?: string[];
  twitterCreator?: string | null;
  /**
   * Card image: "own" when the route segment has its own `opengraph-image` file (leave the field
   * empty so the file applies), a locale-less path of another segment's card, or the site card
   * (default).
   */
  image?: "own" | { path: string };
}

const iso = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString() : undefined;

/**
 * A card image by the locale-less path of the segment that renders it. A page's own `openGraph`
 * replaces the inherited one including its image, and an `opengraph-image` file applies only to
 * its own segment, so pages without one name a card explicitly (the site card by default).
 */
export function ogImage(locale: string, segmentPath = "/") {
  const url = `${localizedPath(segmentPath, locale)}/opengraph-image`;
  return { url, width: 1200, height: 630, alt: "demircucu.com" };
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const url = localizedPath(input.path, input.locale);
  const images =
    input.image === "own" ? undefined : [ogImage(input.locale, input.image?.path ?? "/")];
  const description = plainDescription(input.description);
  const creator = twitterHandle(input.twitterCreator);
  const type = input.type ?? "website";
  return {
    ...(input.title ? { title: input.title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical: url, languages: languageAlternates(input.path) },
    openGraph: {
      type,
      url,
      locale: OG_LOCALES[input.locale],
      alternateLocale: routing.locales
        .filter((locale) => locale !== input.locale)
        .map((locale) => OG_LOCALES[locale]!),
      ...(input.title ? { title: input.title } : {}),
      ...(description ? { description } : {}),
      ...(images ? { images } : {}),
      ...(type === "article"
        ? {
            publishedTime: iso(input.publishedTime),
            modifiedTime: iso(input.modifiedTime),
            tags: input.tags,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(images ? { images } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(description ? { description } : {}),
      ...(creator ? { creator } : {}),
    },
  };
}

/** Private pages (sign-in, profile, admin): never indexed or followed. */
export const PRIVATE_PAGE_METADATA: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
