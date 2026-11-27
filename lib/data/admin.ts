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
  const rows = await prisma.project.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      titleTr: true,
      titleEn: true,
      source: true,
      published: true,
      featured: true,
      order: true,
      githubFullName: true,
      githubUrl: true,
      isArchived: true,
      stars: true,
      lastSyncedAt: true,
      syncStatus: true,
      syncError: true,
      _count: { select: { documents: true } },
    },
  });
  return rows.map(({ githubFullName, ...row }) => ({
    ...row,
    githubFullName,
    // Display title: override, else the repository name.
    displayTitleTr: row.titleTr || row.titleEn || githubFullName?.split("/").pop() || row.slug,
    displayTitleEn: row.titleEn || row.titleTr || githubFullName?.split("/").pop() || row.slug,
  }));
}

export type AdminProjectRow = Awaited<ReturnType<typeof adminListProjects>>[number];

/** Sync settings, recent runs and which credentials are configured (never their values). */
export async function adminGithubOverview() {
  await requireAdmin();
  const [settings, runs] = await Promise.all([
    prisma.githubSyncSettings.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } }),
    prisma.githubSyncRun.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
  ]);
  const env = process.env;
  return {
    settings: {
      includeForks: settings.includeForks,
      includeArchived: settings.includeArchived,
      autoPublishAfter: settings.autoPublishAfter,
    },
    runs: runs.map((run) => ({ ...run, stats: run.stats as Record<string, unknown> | null })),
    config: {
      auth:
        env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY
          ? "app"
          : env.GITHUB_TOKEN
            ? "token"
            : "anonymous",
      webhook: Boolean(env.GITHUB_WEBHOOK_SECRET),
      cron: Boolean(env.CRON_SECRET),
    },
  };
}

export type AdminGithubOverview = Awaited<ReturnType<typeof adminGithubOverview>>;

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
  repoFullName: string | null;
  originUrl: string | null;
  width: number | null;
  height: number | null;
  createdAt: Date;
  /** Content rows that reference the file (foreign keys and MediaUsage). */
  usageCount: number;
  /** Where it is used: "<entity> <field>" labels with the row's slug or id. */
  usedIn: { kind: string; label: string }[];
}

const mediaCountSelect = {
  usages: true,
  documents: true,
  projectLogos: true,
  experienceLogos: true,
  blogPostCovers: true,
  settingsAboutPhoto: true,
  settingsFavicon: true,
} as const;

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
      repoFullName: true,
      originUrl: true,
      width: true,
      height: true,
      createdAt: true,
      _count: { select: mediaCountSelect },
      usages: { select: { entityType: true, entityId: true, field: true } },
      documents: { select: { project: { select: { slug: true } } } },
      projectLogos: { select: { slug: true } },
      experienceLogos: { select: { company: true } },
      blogPostCovers: { select: { slug: true } },
    },
  });

  // Names for MediaUsage rows (entity ids).
  const projectIds = files.flatMap((f) =>
    f.usages.filter((u) => u.entityType === "PROJECT").map((u) => u.entityId),
  );
  const postIds = files.flatMap((f) =>
    f.usages.filter((u) => u.entityType === "BLOG_POST").map((u) => u.entityId),
  );
  const [projects, posts] = await Promise.all([
    projectIds.length
      ? prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, slug: true },
        })
      : [],
    postIds.length
      ? prisma.blogPost.findMany({
          where: { id: { in: postIds } },
          select: { id: true, slug: true },
        })
      : [],
  ]);
  const names = new Map([...projects, ...posts].map((r) => [r.id, r.slug]));

  return files.map(
    ({ _count, usages, documents, projectLogos, experienceLogos, blogPostCovers, ...file }) => ({
      ...file,
      usageCount: Object.values(_count).reduce((sum, n) => sum + n, 0),
      usedIn: [
        ...usages.map((u) => ({
          kind: `${u.entityType}:${u.field}`,
          label: names.get(u.entityId) ?? u.entityId,
        })),
        ...documents.map((d) => ({ kind: "PROJECT:document", label: d.project.slug })),
        ...projectLogos.map((p) => ({ kind: "PROJECT:logo", label: p.slug })),
        ...experienceLogos.map((e) => ({ kind: "EXPERIENCE:logo", label: e.company })),
        ...blogPostCovers.map((p) => ({ kind: "BLOG_POST:cover", label: p.slug })),
        ...(_count.settingsAboutPhoto
          ? [{ kind: "SITE_SETTINGS:aboutPhoto", label: "settings" }]
          : []),
        ...(_count.settingsFavicon ? [{ kind: "SITE_SETTINGS:favicon", label: "settings" }] : []),
      ],
    }),
  );
}

/** GitHub mirrors no content refers to any more (garbage collection candidates). */
export async function unusedGithubMediaIds(): Promise<string[]> {
  await requireAdmin();
  const files = await prisma.mediaFile.findMany({
    where: { source: "GITHUB" },
    select: { id: true, _count: { select: mediaCountSelect } },
  });
  return files.filter((f) => Object.values(f._count).every((n) => n === 0)).map((f) => f.id);
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
  /** Shown among the home page's featured skills. */
  featured: boolean;
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
      featured: true,
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
    featured: row.featured,
    descriptionTr: row.descriptionTr,
    descriptionEn: row.descriptionEn,
    usage: {
      projects: _count.projectTags,
      experiences: _count.experienceTags,
      posts: _count.blogPostTags,
    },
  }));
}
