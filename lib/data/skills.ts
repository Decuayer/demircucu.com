import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CacheTags } from "@/lib/cache/tags";
import { canonicalize } from "@/lib/tags/normalize";
import {
  buildSkillForest,
  flattenForest,
  subtreeIds,
  subtreeSlugMap,
  type TagLink,
  type TreeTag,
} from "@/lib/tags/tree";
import {
  presentExperience,
  presentPost,
  presentProject,
  publicExperienceQuery,
  publicPostQuery,
  publicProjectQuery,
} from "@/lib/data/present";

/**
 * Public skill reads. Only published content and links that are hidden neither on the content
 * nor globally count. Every function is tagged with the content tags as well, because counts
 * and lists change with content.
 */
const SKILL_CACHE_TAGS = [
  CacheTags.tags,
  CacheTags.projects,
  CacheTags.experiences,
  CacheTags.posts,
] as const;

const treeTagSelect = {
  id: true,
  slug: true,
  name: true,
  nameTr: true,
  nameEn: true,
  kind: true,
  parentId: true,
  isSkill: true,
  hidden: true,
  icon: true,
  order: true,
} as const;

const detailTagSelect = { ...treeTagSelect, descriptionTr: true, descriptionEn: true } as const;

const visibleLink = { hidden: false, tag: { hidden: false } } as const;

async function loadGraph(): Promise<{ tags: TreeTag[]; links: TagLink[] }> {
  const [tags, projects, experiences, posts] = await Promise.all([
    prisma.tag.findMany({ select: treeTagSelect }),
    prisma.projectTag.findMany({
      where: { ...visibleLink, project: { published: true } },
      select: { tagId: true, projectId: true },
    }),
    prisma.experienceTag.findMany({
      where: { ...visibleLink, experience: { published: true } },
      select: { tagId: true, experienceId: true },
    }),
    prisma.blogPostTag.findMany({
      where: { ...visibleLink, blogPost: { published: true } },
      select: { tagId: true, blogPostId: true },
    }),
  ]);
  const links: TagLink[] = [
    ...projects.map((l) => ({ tagId: l.tagId, type: "project" as const, entityId: l.projectId })),
    ...experiences.map((l) => ({
      tagId: l.tagId,
      type: "experience" as const,
      entityId: l.experienceId,
    })),
    ...posts.map((l) => ({ tagId: l.tagId, type: "post" as const, entityId: l.blogPostId })),
  ];
  return { tags, links };
}

/** Skill tree for /skills and the About page. */
export async function getSkillForest() {
  "use cache: remote";
  cacheTag(...SKILL_CACHE_TAGS);
  cacheLife("hours");
  const { tags, links } = await loadGraph();
  return buildSkillForest(tags, links);
}

/** Data for `?skill=` / `?tag=` list filters (see components/tags/tag-filter). */
export interface TagFilterData {
  /** Tag slug -> slugs of the tag and every visible tag below it. */
  subtree: Record<string, string[]>;
  labels: Record<string, { name: string; nameTr: string | null; nameEn: string | null }>;
}

export async function getTagFilterData(): Promise<TagFilterData> {
  "use cache: remote";
  cacheTag(CacheTags.tags);
  cacheLife("hours");
  const tags = await prisma.tag.findMany({
    select: {
      id: true,
      slug: true,
      parentId: true,
      hidden: true,
      name: true,
      nameTr: true,
      nameEn: true,
    },
  });
  const labels: TagFilterData["labels"] = {};
  for (const t of tags)
    if (!t.hidden) labels[t.slug] = { name: t.name, nameTr: t.nameTr, nameEn: t.nameEn };
  return { subtree: subtreeSlugMap(tags), labels };
}

export type SkillPageResult =
  | { kind: "found"; skill: Awaited<ReturnType<typeof loadSkillPage>> }
  | { kind: "redirect"; slug: string }
  | { kind: "missing" };

/**
 * Skill detail: the tag, its ancestors and children, published content tagged with it or with
 * a tag below it, first / last use, and related skills. An alias or a non-canonical spelling
 * redirects to the canonical slug; a hidden tag is missing.
 */
export async function getSkillPage(slugInput: string): Promise<SkillPageResult> {
  "use cache: remote";
  cacheTag(...SKILL_CACHE_TAGS);
  cacheLife("hours");
  const tag = await prisma.tag.findUnique({
    where: { slug: slugInput },
    select: detailTagSelect,
  });
  if (!tag) {
    const key = canonicalize(decodeURIComponent(slugInput));
    if (!key) return { kind: "missing" };
    const target =
      (await prisma.tag.findUnique({
        where: { slug: key },
        select: { slug: true, hidden: true },
      })) ??
      (
        await prisma.tagAlias.findUnique({
          where: { alias: key },
          select: { tag: { select: { slug: true, hidden: true } } },
        })
      )?.tag;
    return target && !target.hidden && target.slug !== slugInput
      ? { kind: "redirect", slug: target.slug }
      : { kind: "missing" };
  }
  if (tag.hidden) return { kind: "missing" };
  return { kind: "found", skill: await loadSkillPage(tag) };
}

async function loadSkillPage(
  tag: TreeTag & { descriptionTr: string | null; descriptionEn: string | null },
) {
  const all = await prisma.tag.findMany({ select: treeTagSelect });
  const byId = new Map(all.map((t) => [t.id, t]));
  const ids = subtreeIds(all, tag.id);
  const linkedTo = { some: { tagId: { in: ids }, hidden: false } };

  const [projectRows, experienceRows, postRows] = await Promise.all([
    prisma.project.findMany({
      ...publicProjectQuery,
      where: { published: true, tags: linkedTo },
      orderBy: { order: "asc" },
    }),
    prisma.experience.findMany({
      ...publicExperienceQuery,
      where: { published: true, tags: linkedTo },
      orderBy: { startDate: "desc" },
    }),
    prisma.blogPost.findMany({
      ...publicPostQuery,
      where: { published: true, tags: linkedTo },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const projects = projectRows.map(presentProject);
  const experiences = experienceRows.map(presentExperience);
  const posts = postRows.map(presentPost);

  const ancestors: TreeTag[] = [];
  for (let p = tag.parentId; p && ancestors.length < 1000; p = byId.get(p)?.parentId ?? null) {
    const parent = byId.get(p);
    if (!parent) break;
    if (!parent.hidden) ancestors.unshift(parent);
  }
  const children = all
    .filter((t) => t.parentId === tag.id && !t.hidden)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  // Related: other visible skills that appear on the same content, most frequent first.
  const excluded = new Set([...ids, ...ancestors.map((a) => a.id)]);
  const frequency = new Map<string, number>();
  for (const item of [...projects, ...experiences, ...posts]) {
    for (const t of item.tags) {
      if (!excluded.has(t.id) && t.isSkill) frequency.set(t.id, (frequency.get(t.id) ?? 0) + 1);
    }
  }
  const related = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => byId.get(id)!)
    .filter(Boolean);

  // First / last use: experience dates, repository creation / last push, post dates.
  const starts = [
    ...experiences.map((e) => e.startDate),
    ...projects.map((p) => p.repoCreatedAt ?? p.createdAt),
    ...posts.map((p) => p.createdAt),
  ];
  const ends = [
    ...experiences.flatMap((e) => (e.endDate ? [e.endDate] : [])),
    ...projects.map((p) => p.pushedAt ?? p.updatedAt),
    ...posts.map((p) => p.createdAt),
  ];
  const time = (d: Date) => d.getTime();
  const firstUsed = starts.length ? new Date(Math.min(...starts.map(time))) : null;
  const lastUsed = ends.length ? new Date(Math.max(...ends.map(time))) : null;
  const ongoing = experiences.some((e) => !e.endDate);

  return {
    tag,
    ancestors,
    children,
    related,
    projects,
    experiences,
    posts,
    firstUsed,
    lastUsed,
    ongoing,
  };
}

export type SkillPage = Awaited<ReturnType<typeof loadSkillPage>>;

/** Slugs prerendered at build time and listed in the sitemap: visible tags in use. */
export async function getSkillSlugs(): Promise<string[]> {
  const { tags, links } = await loadGraph();
  const used = new Set(links.map((l) => l.tagId));
  const inTree = new Set(flattenForest(buildSkillForest(tags, links)).map((n) => n.slug));
  return tags.filter((t) => !t.hidden && (used.has(t.id) || inTree.has(t.slug))).map((t) => t.slug);
}
