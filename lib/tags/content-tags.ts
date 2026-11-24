import "server-only";
import type { Prisma } from "@prisma/client";
import type { TagInput } from "@/lib/validation/content";

/**
 * Resolves the tag selector's free-text tags to existing tags (by slug, then by any name) and
 * creates only the ones that are really new. Interim logic until the canonical tag system
 * (Phase 4) replaces the selector; it never touches GITHUB / LANGUAGE join rows.
 */
export async function resolveTagIds(
  tx: Prisma.TransactionClient,
  tags: TagInput[],
): Promise<string[]> {
  if (tags.length === 0) return [];
  const names = tags.flatMap((t) => [t.nameTr, t.nameEn]);
  const existing = await tx.tag.findMany({
    where: {
      OR: [
        { slug: { in: tags.map((t) => t.slug) } },
        { name: { in: names } },
        { nameTr: { in: names } },
        { nameEn: { in: names } },
      ],
    },
    select: { id: true, slug: true, name: true, nameTr: true, nameEn: true },
  });

  const ids: string[] = [];
  for (const tag of tags) {
    const match =
      existing.find((e) => e.slug === tag.slug) ??
      existing.find((e) =>
        [e.name, e.nameTr, e.nameEn].some((n) => n === tag.nameTr || n === tag.nameEn),
      );
    if (match) {
      ids.push(match.id);
      continue;
    }
    const created = await tx.tag.create({
      data: { slug: tag.slug, name: tag.nameEn, nameTr: tag.nameTr, nameEn: tag.nameEn },
      select: { id: true, slug: true, name: true, nameTr: true, nameEn: true },
    });
    existing.push(created);
    ids.push(created.id);
  }
  return [...new Set(ids)];
}

type JoinTable = "project" | "experience" | "blogPost";

/**
 * Makes the MANUAL tags of one entity exactly `tagIds`. Rows with another source (GitHub
 * topics, languages) are kept; a MANUAL row is not added for a tag that is already attached
 * from another source.
 */
export async function replaceManualTags(
  tx: Prisma.TransactionClient,
  table: JoinTable,
  entityId: string,
  tagIds: string[],
): Promise<void> {
  switch (table) {
    case "project": {
      await tx.projectTag.deleteMany({
        where: { projectId: entityId, source: "MANUAL", tagId: { notIn: tagIds } },
      });
      await tx.projectTag.createMany({
        data: tagIds.map((tagId) => ({ projectId: entityId, tagId, source: "MANUAL" as const })),
        skipDuplicates: true,
      });
      return;
    }
    case "experience": {
      await tx.experienceTag.deleteMany({
        where: { experienceId: entityId, source: "MANUAL", tagId: { notIn: tagIds } },
      });
      await tx.experienceTag.createMany({
        data: tagIds.map((tagId) => ({ experienceId: entityId, tagId, source: "MANUAL" as const })),
        skipDuplicates: true,
      });
      return;
    }
    case "blogPost": {
      await tx.blogPostTag.deleteMany({
        where: { blogPostId: entityId, source: "MANUAL", tagId: { notIn: tagIds } },
      });
      await tx.blogPostTag.createMany({
        data: tagIds.map((tagId) => ({ blogPostId: entityId, tagId, source: "MANUAL" as const })),
        skipDuplicates: true,
      });
      return;
    }
  }
}
