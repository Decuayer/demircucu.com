import "server-only";
import type { MediaEntityType, Prisma } from "@prisma/client";
import { UnknownMediaError } from "./usage-errors";

export { UnknownMediaError };

export interface MediaRefs {
  /** Paths that must exist (attachments chosen in the form). */
  required?: Record<string, string[]>;
  /** Paths found in rich text; unknown ones are ignored (e.g. pasted from another environment). */
  optional?: Record<string, string[]>;
}

/**
 * Replaces the MediaUsage rows of the given fields of one entity (fields not named are left
 * alone: the admin form owns "files" / "description", the GitHub sync owns "readme"). Call inside
 * the same transaction that writes the entity, so the usage list never disagrees with the
 * content. Column references (logoPath, coverPath ...) are foreign keys and are not duplicated.
 */
export async function syncMediaUsage(
  tx: Prisma.TransactionClient,
  entityType: MediaEntityType,
  entityId: string,
  refs: MediaRefs,
): Promise<void> {
  const required = Object.entries(refs.required ?? {});
  const optional = Object.entries(refs.optional ?? {});
  const allPaths = [...new Set([...required, ...optional].flatMap(([, paths]) => paths))];

  const files = allPaths.length
    ? await tx.mediaFile.findMany({
        where: { path: { in: allPaths } },
        select: { id: true, path: true },
      })
    : [];
  const idByPath = new Map(files.map((f) => [f.path, f.id]));

  const missing = [...new Set(required.flatMap(([, paths]) => paths))].filter(
    (p) => !idByPath.has(p),
  );
  if (missing.length) throw new UnknownMediaError(missing);

  const rows = new Map<string, Prisma.MediaUsageCreateManyInput>();
  for (const [field, paths] of [...required, ...optional]) {
    for (const path of paths) {
      const mediaFileId = idByPath.get(path);
      if (!mediaFileId) continue;
      rows.set(`${mediaFileId}:${field}`, { mediaFileId, entityType, entityId, field });
    }
  }

  const fields = [...required, ...optional].map(([field]) => field);
  await tx.mediaUsage.deleteMany({ where: { entityType, entityId, field: { in: fields } } });
  if (rows.size) await tx.mediaUsage.createMany({ data: [...rows.values()] });
}

export async function clearMediaUsage(
  tx: Prisma.TransactionClient,
  entityType: MediaEntityType,
  entityId: string,
): Promise<void> {
  await tx.mediaUsage.deleteMany({ where: { entityType, entityId } });
}
