import type { TagKind } from "@prisma/client";

/** Tag columns the public skill tree needs. */
export interface TreeTag {
  id: string;
  slug: string;
  name: string;
  nameTr: string | null;
  nameEn: string | null;
  kind: TagKind;
  parentId: string | null;
  isSkill: boolean;
  hidden: boolean;
  icon: string | null;
  order: number;
}

export type ContentType = "project" | "experience" | "post";

/** A visible tag on a published piece of content. */
export interface TagLink {
  tagId: string;
  type: ContentType;
  entityId: string;
}

export interface SkillCounts {
  projects: number;
  experiences: number;
  posts: number;
}

export interface SkillNode extends Omit<TreeTag, "hidden" | "parentId" | "isSkill"> {
  /** Distinct content tagged with this skill or any skill below it. */
  counts: SkillCounts;
  children: SkillNode[];
}

export interface SkillForest {
  /** Root category nodes (kind DOMAIN). */
  categories: SkillNode[];
  /** Skills without a category. */
  uncategorized: SkillNode[];
}

const shown = (tag: TreeTag) => tag.isSkill && !tag.hidden;

const byOrder = (a: SkillNode, b: SkillNode) => a.order - b.order || a.name.localeCompare(b.name);

/**
 * Builds the public skill tree. Hidden and non-skill tags are left out and their children move
 * up to the nearest shown ancestor; links count once per content item across a subtree; a
 * category (DOMAIN) with nothing under it and no content of its own is dropped.
 */
export function buildSkillForest(tags: readonly TreeTag[], links: readonly TagLink[]): SkillForest {
  const byId = new Map(tags.map((t) => [t.id, t]));
  const effectiveParent = (tag: TreeTag): string | null => {
    let parentId = tag.parentId;
    for (let depth = 0; parentId && depth < 1000; depth++) {
      const parent = byId.get(parentId);
      if (!parent) return null;
      if (shown(parent)) return parent.id;
      parentId = parent.parentId;
    }
    return null;
  };

  const linksByTag = new Map<string, TagLink[]>();
  for (const link of links)
    linksByTag.set(link.tagId, [...(linksByTag.get(link.tagId) ?? []), link]);

  const childrenOf = new Map<string | null, TreeTag[]>();
  for (const tag of tags.filter(shown)) {
    const parent = effectiveParent(tag);
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), tag]);
  }

  const build = (tag: TreeTag): { node: SkillNode | null; keys: Set<string> } => {
    const keys = new Set<string>();
    for (const link of linksByTag.get(tag.id) ?? []) keys.add(`${link.type}:${link.entityId}`);
    const own = keys.size;
    const children: SkillNode[] = [];
    for (const child of childrenOf.get(tag.id) ?? []) {
      const built = build(child);
      for (const key of built.keys) keys.add(key);
      if (built.node) children.push(built.node);
    }
    if (tag.kind === "DOMAIN" && children.length === 0 && own === 0) return { node: null, keys };
    const counts: SkillCounts = { projects: 0, experiences: 0, posts: 0 };
    for (const key of keys) {
      const type = key.slice(0, key.indexOf(":")) as ContentType;
      counts[type === "project" ? "projects" : type === "experience" ? "experiences" : "posts"]++;
    }
    const { id, slug, name, nameTr, nameEn, kind, icon, order } = tag;
    return {
      node: {
        id,
        slug,
        name,
        nameTr,
        nameEn,
        kind,
        icon,
        order,
        counts,
        children: children.sort(byOrder),
      },
      keys,
    };
  };

  const forest: SkillForest = { categories: [], uncategorized: [] };
  for (const root of childrenOf.get(null) ?? []) {
    const { node } = build(root);
    if (!node) continue;
    (root.kind === "DOMAIN" ? forest.categories : forest.uncategorized).push(node);
  }
  forest.categories.sort(byOrder);
  forest.uncategorized.sort(byOrder);
  return forest;
}

/** Ids of the tag and every non-hidden tag below it (hidden subtrees are cut off). */
export function subtreeIds(
  tags: readonly Pick<TreeTag, "id" | "parentId" | "hidden">[],
  rootId: string,
): string[] {
  const children = new Map<string, string[]>();
  for (const tag of tags) {
    if (tag.hidden || !tag.parentId) continue;
    children.set(tag.parentId, [...(children.get(tag.parentId) ?? []), tag.id]);
  }
  const result: string[] = [];
  const stack = [rootId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    stack.push(...(children.get(id) ?? []));
  }
  return result;
}

/** For every non-hidden tag: its slug and the slugs of the tags below it (for list filters). */
export function subtreeSlugMap(
  tags: readonly Pick<TreeTag, "id" | "slug" | "parentId" | "hidden">[],
): Record<string, string[]> {
  const slugOf = new Map(tags.map((t) => [t.id, t.slug]));
  const map: Record<string, string[]> = {};
  for (const tag of tags) {
    if (tag.hidden) continue;
    map[tag.slug] = subtreeIds(tags, tag.id).map((id) => slugOf.get(id)!);
  }
  return map;
}

/** Every node of the forest, depth first. */
export function flattenForest(forest: SkillForest): SkillNode[] {
  const out: SkillNode[] = [];
  const walk = (nodes: SkillNode[]) => {
    for (const node of nodes) {
      out.push(node);
      walk(node.children);
    }
  };
  walk([...forest.categories, ...forest.uncategorized]);
  return out;
}
