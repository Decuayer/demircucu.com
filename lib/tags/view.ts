import type { Tag } from "@prisma/client";

/** Prisma `include` for the visible tags of a content row, in the order they were attached. */
export const visibleTagsInclude = {
  where: { hidden: false },
  include: { tag: true },
  orderBy: { createdAt: "asc" },
} as const;

/** Flattens join rows (`{ tag }[]`) to tags, skipping tags hidden globally. */
export function flattenTags(
  rows: { tag: Tag }[],
  options: { includeHidden?: boolean } = {},
): Tag[] {
  return rows.map((row) => row.tag).filter((tag) => options.includeHidden || !tag.hidden);
}

/** Display name: the translation for the locale if there is one, else the canonical name. */
export function tagLabel(tag: Pick<Tag, "name" | "nameTr" | "nameEn">, locale: string): string {
  return (locale === "tr" ? tag.nameTr : tag.nameEn) || tag.name;
}
