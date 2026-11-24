/** Project list filtering and sorting (client-safe, pure). */

export const PROJECT_SORTS = ["featured", "updated", "stars"] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

export interface ProjectQuery {
  lang: string | null;
  q: string;
  sort: ProjectSort;
}

export interface ListableProject {
  primaryLanguage: string | null;
  featured: boolean;
  order: number;
  stars: number;
  pushedAt: Date | string | null;
  updatedAt: Date | string;
}

const time = (value: Date | string | null) => (value ? new Date(value).getTime() : 0);

const fold = (value: string) =>
  value.toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "");

/**
 * Applies the language and text filters and the sort order. "featured" keeps the admin's
 * order with featured projects first; "updated" uses the last push (or edit for manual ones).
 */
export function filterProjects<T extends ListableProject>(
  items: readonly T[],
  query: ProjectQuery,
  text: (item: T) => string,
): T[] {
  const needle = fold(query.q.trim());
  const filtered = items.filter(
    (item) =>
      (!query.lang || item.primaryLanguage === query.lang) &&
      (!needle || fold(text(item)).includes(needle)),
  );
  const sorted = [...filtered];
  switch (query.sort) {
    case "featured":
      sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order);
      break;
    case "updated":
      sorted.sort((a, b) => time(b.pushedAt ?? b.updatedAt) - time(a.pushedAt ?? a.updatedAt));
      break;
    case "stars":
      sorted.sort((a, b) => b.stars - a.stars || time(b.pushedAt) - time(a.pushedAt));
      break;
  }
  return sorted;
}
