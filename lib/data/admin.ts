import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";

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
  return prisma.project.findUnique({ where: { id }, include: { tags: true } });
}

export async function adminListExperiences() {
  await requireAdmin();
  return prisma.experience.findMany({ orderBy: { startDate: "desc" } });
}

export async function adminGetExperience(id: string) {
  await requireAdmin();
  return prisma.experience.findUnique({ where: { id }, include: { tags: true } });
}

export async function adminListPosts() {
  await requireAdmin();
  return prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
}

export async function adminGetPost(id: string) {
  await requireAdmin();
  return prisma.blogPost.findUnique({ where: { id }, include: { tags: true } });
}

export async function adminListContactMessages() {
  await requireAdmin();
  return prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
}

export async function adminListMediaFiles(typePrefix?: string) {
  await requireAdmin();
  return prisma.mediaFile.findMany({
    where: typePrefix ? { type: { startsWith: typePrefix } } : {},
    orderBy: { createdAt: "desc" },
  });
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
