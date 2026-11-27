import { jsonLd } from "@/lib/seo/json-ld";

/** Structured data for search engines; the payload is escaped by `jsonLd`. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Escaped: "<", ">", "&" and line separators are unicode escapes (lib/seo/json-ld.ts).
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  );
}
