import "server-only";
import type { Prisma } from "@prisma/client";

type JoinTable = "project" | "experience" | "blogPost";

export interface ContentTagsInput {
  /** MANUAL tags; omitted means "leave the tags as they are". */
  tagIds?: string[];
  /** Attached tags hidden on this row; omitted means "leave visibility as it is". */
  hiddenTagIds?: string[];
}

/**
 * Applies the tag selector's result to one content row. MANUAL rows become exactly `tagIds`;
 * rows with another source (GitHub topics, languages) are never removed here, only hidden or
 * shown; a MANUAL row is not added for a tag that is already attached from another source.
 */
export async function applyContentTags(
  tx: Prisma.TransactionClient,
  table: JoinTable,
  entityId: string,
  { tagIds, hiddenTagIds }: ContentTagsInput,
): Promise<void> {
  const ids = tagIds && [...new Set(tagIds)];
  const hidden = hiddenTagIds && [...new Set(hiddenTagIds)];
  switch (table) {
    case "project": {
      const where = { projectId: entityId };
      if (ids) {
        await tx.projectTag.deleteMany({
          where: { ...where, source: "MANUAL", tagId: { notIn: ids } },
        });
        await tx.projectTag.createMany({
          data: ids.map((tagId) => ({ ...where, tagId, source: "MANUAL" as const })),
          skipDuplicates: true,
        });
      }
      if (hidden) {
        await tx.projectTag.updateMany({
          where: { ...where, tagId: { in: hidden } },
          data: { hidden: true },
        });
        await tx.projectTag.updateMany({
          where: { ...where, tagId: { notIn: hidden } },
          data: { hidden: false },
        });
      }
      return;
    }
    case "experience": {
      const where = { experienceId: entityId };
      if (ids) {
        await tx.experienceTag.deleteMany({
          where: { ...where, source: "MANUAL", tagId: { notIn: ids } },
        });
        await tx.experienceTag.createMany({
          data: ids.map((tagId) => ({ ...where, tagId, source: "MANUAL" as const })),
          skipDuplicates: true,
        });
      }
      if (hidden) {
        await tx.experienceTag.updateMany({
          where: { ...where, tagId: { in: hidden } },
          data: { hidden: true },
        });
        await tx.experienceTag.updateMany({
          where: { ...where, tagId: { notIn: hidden } },
          data: { hidden: false },
        });
      }
      return;
    }
    case "blogPost": {
      const where = { blogPostId: entityId };
      if (ids) {
        await tx.blogPostTag.deleteMany({
          where: { ...where, source: "MANUAL", tagId: { notIn: ids } },
        });
        await tx.blogPostTag.createMany({
          data: ids.map((tagId) => ({ ...where, tagId, source: "MANUAL" as const })),
          skipDuplicates: true,
        });
      }
      if (hidden) {
        await tx.blogPostTag.updateMany({
          where: { ...where, tagId: { in: hidden } },
          data: { hidden: true },
        });
        await tx.blogPostTag.updateMany({
          where: { ...where, tagId: { notIn: hidden } },
          data: { hidden: false },
        });
      }
      return;
    }
  }
}
