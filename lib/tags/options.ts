import type { TagKind } from "@prisma/client";
import { canonicalize } from "./normalize";

/** A tag as the admin tag selector and skills page see it. */
export interface TagOption {
  id: string;
  slug: string;
  name: string;
  nameTr: string | null;
  nameEn: string | null;
  kind: TagKind;
  parentId: string | null;
  isSkill: boolean;
  hidden: boolean;
  aliases: string[];
}

/**
 * Tag selector search: the canonical query against slug, aliases and names (any spelling,
 * Turkish characters folded). Exact matches first, then prefixes, then substrings.
 */
export function searchTagOptions<T extends TagOption>(
  options: readonly T[],
  query: string,
  limit = 20,
): T[] {
  const q = canonicalize(query);
  if (!q) return options.slice(0, limit);
  const scored: { option: T; score: number }[] = [];
  for (const option of options) {
    const keys = [
      option.slug,
      ...option.aliases,
      ...[option.name, option.nameTr, option.nameEn].map((n) => (n ? canonicalize(n) : null)),
    ].filter((k): k is string => Boolean(k));
    let score = 0;
    for (const key of keys) {
      if (key === q) score = Math.max(score, 3);
      else if (key.startsWith(q)) score = Math.max(score, 2);
      else if (key.includes(q)) score = Math.max(score, 1);
    }
    if (score > 0) scored.push({ option, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.option.name.localeCompare(b.option.name))
    .slice(0, limit)
    .map((s) => s.option);
}

/** True when the query names an existing tag exactly (so "create" is not offered). */
export function hasExactTag(options: readonly TagOption[], query: string): boolean {
  const q = canonicalize(query);
  return Boolean(q) && options.some((o) => o.slug === q || o.aliases.includes(q!));
}

/** "Web › Frontend › Next.js" style path of a tag (cycles are impossible, but bounded anyway). */
export function tagPath(options: readonly TagOption[], id: string, separator = " › "): string {
  const byId = new Map(options.map((o) => [o.id, o]));
  const names: string[] = [];
  for (let current = byId.get(id); current && names.length < 50;) {
    names.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return names.join(separator);
}
