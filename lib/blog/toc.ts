import { decodeEntities } from "@/lib/projects/readme";

/**
 * Table of contents for a blog post (phase 8): gives every `h2` / `h3` of the stored, sanitized
 * HTML an id when the page renders (content and schema stay unchanged) and lists them. Ids are
 * slugs of the heading text with Turkish letters folded ("Ölçek ve ritim" → "olcek-ve-ritim");
 * repeats get "-2", "-3". `tabindex="-1"` lets the table of contents move focus to the heading.
 * Client-safe, pure.
 */

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

/** A table of contents is shown from this many headings (same rule as the README). */
export const TOC_MIN_HEADINGS = 3;

const FOLD: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };

/** Ids the page itself uses; a heading never takes them. */
const RESERVED = new Set(["main-content", "comments"]);

export function headingSlug(text: string): string {
  const slug = text
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (letter) => FOLD[letter]!)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  return slug || "section";
}

export function withHeadingIds(html: string): { html: string; headings: TocHeading[] } {
  const used = new Set(RESERVED);
  const headings: TocHeading[] = [];
  const out = html.replace(
    /<h([23])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/g,
    (_match, level: string, attrs: string, inner: string) => {
      const text = decodeEntities(inner.replace(/<[^>]+>/g, ""))
        .replace(/\s+/g, " ")
        .trim();
      const base = headingSlug(text);
      let id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      used.add(id);
      if (text) headings.push({ id, text, level: Number(level) as 2 | 3 });
      const rest = attrs.replace(/\s+id\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
      return `<h${level} id="${id}" tabindex="-1"${rest}>${inner}</h${level}>`;
    },
  );
  return { html: out, headings };
}
