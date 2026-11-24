"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { invalidate } from "@/lib/cache/tags";
import { fail, ok, toActionFailure, type ActionResult } from "@/lib/actions/result";
import { id as idSchema } from "@/lib/validation/common";
import {
  aliasSchema,
  createTagSchema,
  updateTagSchema,
  type CreateTagInput,
  type UpdateTagInput,
} from "@/lib/validation/tags";
import { deleteUnusedTag, isDescendant, mergeTags, TagResolver } from "@/lib/tags/service";
import { TagCycleError } from "@/lib/tags/errors";
import type { TagOption } from "@/lib/tags/options";

const optionSelect = {
  id: true,
  slug: true,
  name: true,
  nameTr: true,
  nameEn: true,
  kind: true,
  parentId: true,
  isSkill: true,
  hidden: true,
  aliases: { select: { alias: true } },
} as const;

async function toOption(id: string): Promise<TagOption> {
  const row = await prisma.tag.findUniqueOrThrow({ where: { id }, select: optionSelect });
  return { ...row, aliases: row.aliases.map((a) => a.alias) };
}

/**
 * Creates a tag from the selector or the skills page. A name that already resolves to a tag
 * (slug or alias) returns that tag instead of a duplicate.
 */
export async function createTag(
  input: CreateTagInput,
): Promise<ActionResult<{ tag: TagOption; existing: boolean }>> {
  try {
    await requireAdmin();
    const data = createTagSchema.parse(input);
    const result = await prisma.$transaction(async (tx) => {
      const resolver = await TagResolver.load(tx);
      const key = data.slug ?? data.name;
      const known = resolver.resolve(key);
      if (known) return { id: known.id, existing: true };
      // Without a kind or parent of its own, a tag the taxonomy knows gets the taxonomy's.
      const explicit = Boolean(data.parentId) || data.kind !== "TOPIC";
      const tag = await resolver.ensure(key, { ...data, explicit });
      if (!tag) throw new Error("unreachable: slug validated");
      return { id: tag.id, existing: false };
    });
    if (!result.existing) invalidate({ entity: "tags" });
    return ok({ tag: await toOption(result.id), existing: result.existing });
  } catch (error) {
    return toActionFailure(error, "createTag");
  }
}

/**
 * Renames, moves or re-flags a tag. A changed slug keeps the old one as an alias so links and
 * future GitHub topics still resolve.
 */
export async function updateTag(idInput: string, input: UpdateTagInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    const data = updateTagSchema.parse(input);
    await prisma.$transaction(async (tx) => {
      const before = await tx.tag.findUniqueOrThrow({ where: { id }, select: { slug: true } });
      if (data.parentId && (data.parentId === id || (await isDescendant(tx, data.parentId, id)))) {
        throw new TagCycleError();
      }
      if (data.slug && data.slug !== before.slug) {
        // The new slug may be one of this tag's own aliases; it stops being an alias.
        await tx.tagAlias.deleteMany({ where: { alias: data.slug, tagId: id } });
      }
      await tx.tag.update({ where: { id }, data });
      if (data.slug && data.slug !== before.slug) {
        await tx.tagAlias.create({ data: { alias: before.slug, tagId: id } });
      }
    });
    invalidate({ entity: "tags" });
    return ok();
  } catch (error) {
    return toActionFailure(error, "updateTag");
  }
}

/** Moves a tag one place up or down among its siblings (renumbers the siblings 0..n). */
export async function reorderTag(idInput: string, direction: "up" | "down"): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    if (direction !== "up" && direction !== "down") return fail("invalidInput");
    await prisma.$transaction(async (tx) => {
      const { parentId } = await tx.tag.findUniqueOrThrow({
        where: { id },
        select: { parentId: true },
      });
      const siblings = await tx.tag.findMany({
        where: { parentId },
        select: { id: true },
        orderBy: [{ order: "asc" }, { name: "asc" }],
      });
      const ids = siblings.map((s) => s.id);
      const from = ids.indexOf(id);
      const to = direction === "up" ? from - 1 : from + 1;
      if (to < 0 || to >= ids.length) return;
      [ids[from], ids[to]] = [ids[to]!, ids[from]!];
      for (const [order, siblingId] of ids.entries()) {
        await tx.tag.update({ where: { id: siblingId }, data: { order } });
      }
    });
    invalidate({ entity: "tags" });
    return ok();
  } catch (error) {
    return toActionFailure(error, "reorderTag");
  }
}

export async function addTagAlias(tagIdInput: string, aliasInput: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const tagId = idSchema.parse(tagIdInput);
    const alias = aliasSchema.parse(aliasInput);
    await prisma.tagAlias.create({ data: { alias, tagId } });
    invalidate({ entity: "tags" });
    return ok();
  } catch (error) {
    return toActionFailure(error, "addTagAlias");
  }
}

export async function removeTagAlias(aliasInput: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const alias = aliasSchema.parse(aliasInput);
    await prisma.tagAlias.delete({ where: { alias } });
    invalidate({ entity: "tags" });
    return ok();
  } catch (error) {
    return toActionFailure(error, "removeTagAlias");
  }
}

/** Merges one tag into another; every content link, alias and child moves to the target. */
export async function mergeTag(fromInput: string, intoInput: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const from = idSchema.parse(fromInput);
    const into = idSchema.parse(intoInput);
    if (from === into) return fail("invalidInput");
    await prisma.$transaction((tx) => mergeTags(tx, from, into));
    invalidate({ entity: "tags" });
    return ok();
  } catch (error) {
    return toActionFailure(error, "mergeTag");
  }
}

/** Deletes a tag that has no content links and no children (otherwise: tagInUse). */
export async function deleteTag(idInput: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    await prisma.$transaction((tx) => deleteUnusedTag(tx, id));
    invalidate({ entity: "tags" });
    return ok();
  } catch (error) {
    return toActionFailure(error, "deleteTag");
  }
}
