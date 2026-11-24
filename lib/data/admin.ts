import "server-only";
import { prisma } from "@/lib/prisma";
import type { MediaSource } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/guards";
import type { TagSource } from "@prisma/client";
import type { TagOption } from "@/lib/tags/options";

const tagOptionSelect = {
  id: true,
  slug: true,
  name: true,
  nameTr: true,
  nameEn: true,
  kind: true,
  parentId: true,
  isSkill: true,
  hidden: true,
  aliases: { select: { alias: true }, orderBy: { alias: "asc" } },
} as const;

type TagOptionRow = {
  aliases: { alias: string }[];
} & Omit<TagOption, "aliases">;

const toTagOption = ({ aliases, ...tag }: TagOptionRow): TagOption => ({
  ...tag,
  aliases: aliases.map((a) => a.alias),
});

/** A tag attached to the content row being edited, with how it got there. */
export interface AdminTagLink extends TagOption {
  source: TagSource;
  /** Hidden on this row only. */
  linkHidden: boolean;
}

const linkInclude = {
  include: { tag: { select: tagOptionSelect } },
  orderBy: { createdAt: "asc" },
} as const;

const toLinks = (
  rows: { source: TagSource; hidden: boolean; tag: TagOptionRow }[],
): AdminTagLink[] =>
  rows.map((row) => ({ ...toTagOption(row.tag), source: row.source, linkHidden: row.hidden }));

/**
 * Admin reads. Every function checks the role itself so a caller can never forget it; none of
 * them is cached (admin pages always show the current database state).
 */

export async function adminListProjects() {
  await requireAdmin();
  return prisma.project.findMany({ orderBy: { order: "asc" } });
}

export async function adminGetProject(id: string) {
  await requireAdmin();
  const row = await prisma.project.findUnique({
    where: { id },
    include: { tags: linkInclude },
  });
  return row && { ...row, tags: toLinks(row.tags) };
}

export async function adminListExperiences() {
  await requireAdmin();
  return prisma.experience.findMany({ orderBy: { startDate: "desc" } });
}

export async function adminGetExperience(id: string) {
  await requireAdmin();
  const row = await prisma.experience.findUnique({
    where: { id },
    include: { tags: linkInclude },
  });
  return row && { ...row, tags: toLinks(row.tags) };
}

export async function adminListPosts() {
  await requireAdmin();
  return prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
}

export async function adminGetPost(id: string) {
  await requireAdmin();
  const row = await prisma.blogPost.findUnique({
    where: { id },
    include: { tags: linkInclude },
  });
  return row && { ...row, tags: toLinks(row.tags) };
}

export async function adminListContactMessages() {
  await requireAdmin();
  return prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
}

export interface AdminMediaItem {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  source: MediaSource;
  createdAt: Date;
  /** Content rows that reference the file (foreign keys and MediaUsage). */
  usageCount: number;
}

export async function adminListMediaFiles(typePrefix?: string): Promise<AdminMediaItem[]> {
  await requireAdmin();
  const files = await prisma.mediaFile.findMany({
    where: typePrefix ? { type: { startsWith: typePrefix } } : {},
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      size: true,
      path: true,
      source: true,
      createdAt: true,
      _count: {
        select: {
          usages: true,
          documents: true,
          projectLogos: true,
          experienceLogos: true,
          blogPostCovers: true,
          settingsAboutPhoto: true,
          settingsFavicon: true,
        },
      },
    },
  });
  return files.map(({ _count, ...file }) => ({
    ...file,
    usageCount: Object.values(_count).reduce((sum, n) => sum + n, 0),
  }));
}

export async function adminListComments() {
  await requireAdmin();
  return prisma.comment.findMany({
    include: {
      author: { select: { name: true, email: true } },
      post: { select: { titleTr: true, titleEn: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function adminGetSiteSettings() {
  await requireAdmin();
  return prisma.siteSettings.findUnique({ where: { id: "main" } });
}

/** Every tag, for the tag selector. */
export async function adminListTagOptions(): Promise<TagOption[]> {
  await requireAdmin();
  const rows = await prisma.tag.findMany({ select: tagOptionSelect, orderBy: { name: "asc" } });
  return rows.map(toTagOption);
}

export interface AdminTag extends TagOption {
  icon: string | null;
  order: number;
  descriptionTr: string | null;
  descriptionEn: string | null;
  /** Links on any content, published or not. */
  usage: { projects: number; experiences: number; posts: number };
}

/** Every tag with its usage, for the skills page (tree built on the client). */
export async function adminListTags(): Promise<AdminTag[]> {
  await requireAdmin();
  const rows = await prisma.tag.findMany({
    select: {
      ...tagOptionSelect,
      icon: true,
      order: true,
      descriptionTr: true,
      descriptionEn: true,
      _count: { select: { projectTags: true, experienceTags: true, blogPostTags: true } },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return rows.map(({ _count, ...row }) => ({
    ...toTagOption(row),
    icon: row.icon,
    order: row.order,
    descriptionTr: row.descriptionTr,
    descriptionEn: row.descriptionEn,
    usage: {
      projects: _count.projectTags,
      experiences: _count.experienceTags,
      posts: _count.blogPostTags,
    },
  }));
}
