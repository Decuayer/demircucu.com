"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { tagLabel } from "@/lib/tags/view";
import type { TagFilterData } from "@/lib/data/skills";

export interface ActiveTagFilter {
  slug: string;
  label: string;
}

/** Reports a query parameter; isolated in its own Suspense boundary (useSearchParams). */
function ParamReader({
  param,
  onChange,
}: {
  param: string;
  onChange: (value: string | null) => void;
}) {
  const value = useSearchParams().get(param);
  useEffect(() => onChange(value), [value, onChange]);
  return null;
}

/**
 * Filters items by the `param` query value (a tag slug; the tag's subtree matches too). The
 * server renders the unfiltered list (prerendered HTML keeps every item); the filter applies
 * once the browser has read the URL. Render the returned `reader` somewhere in the tree.
 */
export function useTagFilter<T extends { tags: readonly { slug: string }[] }>(
  items: readonly T[],
  param: string,
  data: TagFilterData,
  locale: string,
): { items: readonly T[]; active: ActiveTagFilter | null; reader: React.ReactNode } {
  const [slug, setSlug] = useState<string | null>(null);
  const reader = (
    <Suspense fallback={null}>
      <ParamReader param={param} onChange={setSlug} />
    </Suspense>
  );
  if (!slug || !data.subtree[slug]) return { items, active: null, reader };
  const wanted = new Set(data.subtree[slug]);
  const label = data.labels[slug];
  return {
    items: items.filter((item) => item.tags.some((t) => wanted.has(t.slug))),
    active: { slug, label: label ? tagLabel(label, locale) : slug },
    reader,
  };
}

/** "Filtered by X" bar with links to the skill page and to the unfiltered list. */
export function TagFilterBar({ active, count }: { active: ActiveTagFilter | null; count: number }) {
  const t = useTranslations("tags");
  const pathname = usePathname();
  if (!active) return null;
  return (
    <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-sm">
      <span className="text-muted-foreground">
        {t.rich("filteredBy", {
          count,
          tag: () => (
            <Link href={`/skills/${active.slug}`} className="font-medium text-foreground underline">
              {active.label}
            </Link>
          ),
        })}
      </span>
      <Link
        href={pathname}
        className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-1 text-xs hover:bg-accent"
      >
        <X className="h-3 w-3" />
        {t("clearFilter")}
      </Link>
    </div>
  );
}
