import { localizedPath } from "./metadata";

/**
 * schema.org structured data (JSON-LD) for public pages. Builders return plain objects; `jsonLd`
 * serializes them for a <script type="application/ld+json"> with "<" escaped, so content can never
 * close the script element (the Next.js JSON-LD guide's recommendation).
 */

type Thing = Record<string, unknown>;

const SCHEMA = "https://schema.org";

/** Absolute URL of a locale-less path. */
export function absoluteUrl(base: URL, path: string, locale?: string): string {
  return new URL(locale ? localizedPath(path, locale) : path, base).toString();
}

export function jsonLd(data: Thing | Thing[]): string {
  const value = Array.isArray(data)
    ? { "@context": SCHEMA, "@graph": data }
    : { "@context": SCHEMA, ...data };
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

const compact = (value: Thing): Thing =>
  Object.fromEntries(
    Object.entries(value).filter(
      ([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
    ),
  );

export interface PersonInput {
  base: URL;
  locale: string;
  name: string;
  jobTitle?: string | null;
  description?: string | null;
  image?: string | null;
  sameAs?: (string | null | undefined)[];
  email?: string | null;
  location?: string | null;
}

export const personId = (base: URL) => `${new URL("/", base).toString()}#person`;
export const websiteId = (base: URL) => `${new URL("/", base).toString()}#website`;

export function person(input: PersonInput): Thing {
  return compact({
    "@type": "Person",
    "@id": personId(input.base),
    name: input.name,
    url: absoluteUrl(input.base, "/about", input.locale),
    jobTitle: input.jobTitle,
    description: input.description,
    image: input.image,
    email: input.email ? `mailto:${input.email}` : undefined,
    address: input.location
      ? { "@type": "PostalAddress", addressLocality: input.location }
      : undefined,
    sameAs: (input.sameAs ?? []).filter((url): url is string => !!url),
  });
}

export function website(input: {
  base: URL;
  locale: string;
  name: string;
  description?: string | null;
}): Thing {
  return compact({
    "@type": "WebSite",
    "@id": websiteId(input.base),
    url: absoluteUrl(input.base, "/", input.locale),
    name: input.name,
    description: input.description,
    inLanguage: ["tr", "en"],
    publisher: { "@id": personId(input.base) },
  });
}

export function breadcrumbs(
  base: URL,
  locale: string,
  items: { name: string; path: string }[],
): Thing {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(base, item.path, locale),
    })),
  };
}

export function blogPosting(input: {
  base: URL;
  locale: string;
  path: string;
  headline: string;
  description?: string | null;
  datePublished: Date | string;
  dateModified?: Date | string | null;
  image?: string | null;
  keywords?: string[];
  authorName: string;
  wordCount?: number;
}): Thing {
  const url = absoluteUrl(input.base, input.path, input.locale);
  return compact({
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: input.headline.slice(0, 110),
    description: input.description,
    datePublished: new Date(input.datePublished).toISOString(),
    dateModified: new Date(input.dateModified ?? input.datePublished).toISOString(),
    image: input.image,
    inLanguage: input.locale,
    keywords: input.keywords?.join(", "),
    wordCount: input.wordCount,
    author: { "@type": "Person", "@id": personId(input.base), name: input.authorName },
    publisher: { "@id": personId(input.base) },
    isPartOf: { "@id": websiteId(input.base) },
  });
}

export function softwareSourceCode(input: {
  base: URL;
  locale: string;
  path: string;
  name: string;
  description?: string | null;
  codeRepository?: string | null;
  programmingLanguage?: string | null;
  liveUrl?: string | null;
  dateModified?: Date | string | null;
  keywords?: string[];
  image?: string | null;
}): Thing {
  const url = absoluteUrl(input.base, input.path, input.locale);
  return compact({
    "@type": "SoftwareSourceCode",
    "@id": `${url}#code`,
    url,
    name: input.name,
    description: input.description,
    codeRepository: input.codeRepository,
    programmingLanguage: input.programmingLanguage,
    sameAs: input.liveUrl ? [input.liveUrl] : undefined,
    dateModified: input.dateModified ? new Date(input.dateModified).toISOString() : undefined,
    keywords: input.keywords?.join(", "),
    image: input.image,
    inLanguage: input.locale,
    author: { "@id": personId(input.base) },
  });
}
