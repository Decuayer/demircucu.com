import "server-only";
import { prisma } from "@/lib/prisma";
import type { MediaSource } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/guards";
import { allTagsInclude, flattenTags } from "@/lib/tags/view";

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
    include: { tags: allTagsInclude },
  });
  return row && { ...row, tags: flattenTags(row.tags, { includeHidden: true }) };
}

export async function adminListExperiences() {
  await requireAdmin();
  return prisma.experience.findMany({ orderBy: { startDate: "desc" } });
}

export async function adminGetExperience(id: string) {
  await requireAdmin();
  const row = await prisma.experience.findUnique({
    where: { id },
    include: { tags: allTagsInclude },
  });
  return row && { ...row, tags: flattenTags(row.tags, { includeHidden: true }) };
}

export async function adminListPosts() {
  await requireAdmin();
  return prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
}

export async function adminGetPost(id: string) {
  await requireAdmin();
  const row = await prisma.blogPost.findUnique({
    where: { id },
    include: { tags: allTagsInclude },
  });
  return row && { ...row, tags: flattenTags(row.tags, { includeHidden: true }) };
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
