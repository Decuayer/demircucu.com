import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * The single HTML sanitizer for user-authored rich text (blog posts, project and experience
 * descriptions, the about bio) and, from Phase 5, rendered READMEs.
 *
 * Based on GitHub's allowlist (`hast-util-sanitize` default schema): no `<script>`, `<style>`,
 * `<iframe>`, `<object>`, event handler attributes, inline styles or `javascript:` / `data:`
 * URLs. Links that open a new tab always get `rel="noopener noreferrer nofollow"`.
 *
 * Content is sanitized when it is saved and again when it is rendered, so rows written before
 * this sanitizer existed are safe too.
 */
export const RICH_TEXT_SCHEMA: SanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u", "mark", "figure", "figcaption"],
  // Drop the element and its text content.
  strip: [...(defaultSchema.strip ?? []), "style", "noscript", "template"],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), ["target", "_blank"], "rel"],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
};

function hardenLinks() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      if (node.properties.target === "_blank") {
        node.properties.rel = ["noopener", "noreferrer", "nofollow"];
      } else {
        delete node.properties.rel;
      }
    });
  };
}

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize, RICH_TEXT_SCHEMA)
  .use(hardenLinks)
  .use(rehypeStringify)
  .freeze();

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return String(processor.processSync(html));
}

/** `sanitizeHtml` that keeps `null` for optional columns. */
export function sanitizeOptionalHtml(html: string | null | undefined): string | null {
  if (html === null || html === undefined) return null;
  return sanitizeHtml(html);
}
