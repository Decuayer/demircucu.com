/**
 * Tag writes shared by server actions, the GitHub sync and `scripts/migrate-tags.ts` (no
 * `server-only` marker so the script can import it; it only takes a transaction client).
 */
import type { Prisma, TagKind } from "@prisma/client";
import { canonicalize, displayNameFromTopic, type ResolvableTag } from "./normalize";
import { TagInUseError } from "./errors";
import { taxonomyNode, taxonomyOrder, type TaxonomyNode } from "./taxonomy";

type Tx = Prisma.TransactionClient;

export interface IndexedTag extends ResolvableTag {
  name: string;
}

/** Attributes for a tag that is not in the taxonomy. */
export interface NewTagDefaults {
  name?: string;
  nameTr?: string | null;
  nameEn?: string | null;
  kind?: TagKind;
  isSkill?: boolean;
  parentId?: string | null;
  /** Use these attributes even when the taxonomy knows the tag (admin's explicit choice). */
  explicit?: boolean;
}

/**
 * Resolves names to tags within one transaction and creates the missing ones (approved: an
 * unknown GitHub topic becomes a visible tag straight away; the admin fixes it later). Tags
 * the taxonomy knows are created with its name, kind, parent (ancestors included) and aliases.
 */
export class TagResolver {
  private constructor(
    private readonly tx: Tx,
    private readonly index: Map<string, IndexedTag>,
  ) {}

  static async load(tx: Tx): Promise<TagResolver> {
    const rows = await tx.tag.findMany({
      select: { id: true, slug: true, name: true, aliases: { select: { alias: true } } },
    });
    const resolver = new TagResolver(tx, new Map());
    for (const row of rows) {
      resolver.remember({ ...row, aliases: row.aliases.map((a) => a.alias) });
    }
    return resolver;
  }

  private remember(tag: IndexedTag): void {
    for (const alias of tag.aliases) if (!this.index.has(alias)) this.index.set(alias, tag);
    this.index.set(tag.slug, tag);
  }

  /** Existing tag for the input (slug, then alias, both canonical), without creating one. */
  resolve(input: string): IndexedTag | null {
    const key = canonicalize(input);
    return key ? (this.index.get(key) ?? null) : null;
  }

  /** The tag for the input, created if needed. `null` only for input with no letters/digits. */
  async ensure(input: string, defaults: NewTagDefaults = {}): Promise<IndexedTag | null> {
    const key = canonicalize(input);
    if (!key) return null;
    const existing = this.index.get(key);
    if (existing) return existing;

    const node = defaults.explicit ? undefined : taxonomyNode(key);
    if (node) return this.createFromTaxonomy(node);

    const looksLikeTopic = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(input.trim());
    return this.create({
      slug: key,
      name: defaults.name?.trim() || (looksLikeTopic ? displayNameFromTopic(input) : input.trim()),
      nameTr: defaults.nameTr || null,
      nameEn: defaults.nameEn || null,
      kind: defaults.kind ?? "TOPIC",
      isSkill: defaults.isSkill ?? true,
      parentId: defaults.parentId ?? null,
    });
  }

  /** Ensures every input and returns the distinct tag ids, in input order. */
  async ensureAll(inputs: readonly string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const input of inputs) {
      const tag = await this.ensure(input);
      if (tag && !ids.includes(tag.id)) ids.push(tag.id);
    }
    return ids;
  }

  private async createFromTaxonomy(node: TaxonomyNode): Promise<IndexedTag> {
    const existing = this.index.get(node.slug);
    if (existing) return existing;
    const parent = node.parent ? await this.ensure(node.parent) : null;
    return this.create(
      {
        slug: node.slug,
        name: node.name,
        nameTr: node.nameTr ?? null,
        nameEn: node.nameEn ?? null,
        kind: node.kind,
        isSkill: node.isSkill ?? true,
        icon: node.icon ?? null,
        parentId: parent?.id ?? null,
        order: taxonomyOrder(node.slug),
      },
      node.aliases ?? [],
    );
  }

  private async create(
    data: Prisma.TagUncheckedCreateInput & { slug: string },
    aliases: readonly string[] = [],
  ): Promise<IndexedTag> {
    // Aliases already taken by another tag (an admin may have moved them) are left alone.
    const free = aliases.filter((alias) => alias !== data.slug && !this.index.has(alias));
    const row = await this.tx.tag.upsert({
      where: { slug: data.slug },
      update: {},
      create: data,
      select: { id: true, slug: true, name: true },
    });
    if (free.length > 0) {
      await this.tx.tagAlias.createMany({
        data: free.map((alias) => ({ alias, tagId: row.id })),
        skipDuplicates: true,
      });
    }
    const tag = { ...row, aliases: free };
    this.remember(tag);
    return tag;
  }
}

/**
 * Merges `fromId` into `intoId` in one transaction (task 2.5: no relation is lost). Content
 * links move over (a link the target already has is kept as is), aliases move, the source
 * slug becomes an alias, children are re-parented, and the source tag is deleted.
 */
export async function mergeTags(tx: Tx, fromId: string, intoId: string): Promise<void> {
  if (fromId === intoId) throw new Error("cannot merge a tag into itself");
  const from = await tx.tag.findUniqueOrThrow({
    where: { id: fromId },
    select: { slug: true, parentId: true, aliases: { select: { alias: true } } },
  });
  const into = await tx.tag.findUniqueOrThrow({ where: { id: intoId }, select: { id: true } });

  for (const [table, key] of [
    ["ProjectTag", "projectId"],
    ["ExperienceTag", "experienceId"],
    ["BlogPostTag", "blogPostId"],
  ] as const) {
    await tx.$executeRawUnsafe(
      `UPDATE "${table}" AS t SET "tagId" = $2
       WHERE t."tagId" = $1 AND NOT EXISTS (
         SELECT 1 FROM "${table}" o WHERE o."${key}" = t."${key}" AND o."tagId" = $2)`,
      fromId,
      intoId,
    );
    await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "tagId" = $1`, fromId);
  }

  // If the target sits below the source, lift it to the source's place first so re-parenting
  // the source's children cannot form a cycle.
  if (await isDescendant(tx, intoId, fromId)) {
    await tx.tag.update({ where: { id: intoId }, data: { parentId: from.parentId } });
  }
  await tx.tag.updateMany({
    where: { parentId: fromId, id: { not: intoId } },
    data: { parentId: into.id },
  });

  await tx.tag.delete({ where: { id: fromId } }); // aliases cascade
  const aliases = [from.slug, ...from.aliases.map((a) => a.alias)];
  await tx.tagAlias.createMany({
    data: aliases.map((alias) => ({ alias, tagId: intoId })),
    skipDuplicates: true,
  });
}

/** True when `id` is somewhere below `ancestorId`. */
export async function isDescendant(tx: Tx, id: string, ancestorId: string): Promise<boolean> {
  let current = await tx.tag.findUnique({ where: { id }, select: { parentId: true } });
  for (let depth = 0; current?.parentId && depth < 1000; depth++) {
    if (current.parentId === ancestorId) return true;
    current = await tx.tag.findUnique({
      where: { id: current.parentId },
      select: { parentId: true },
    });
  }
  return false;
}

/** Deletes a tag nothing refers to; a tag with content links or children must be merged. */
export async function deleteUnusedTag(tx: Tx, id: string): Promise<void> {
  const tag = await tx.tag.findUniqueOrThrow({
    where: { id },
    select: {
      _count: {
        select: { projectTags: true, experienceTags: true, blogPostTags: true, children: true },
      },
    },
  });
  const c = tag._count;
  if (c.projectTags + c.experienceTags + c.blogPostTags + c.children > 0) throw new TagInUseError();
  await tx.tag.delete({ where: { id } });
}
