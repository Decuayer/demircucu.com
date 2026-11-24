import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CacheTags } from "@/lib/cache/tags";
import { sanitizeOptionalHtml } from "@/lib/sanitize/html";

export async function getPublishedProjects() {
  "use cache: remote";
  cacheTag(CacheTags.projects);
  cacheLife("hours");
  return prisma.project.findMany({
    where: { published: true },
    include: { tags: true },
    orderBy: { order: "asc" },
  });
}

export async function getFeaturedProjects() {
  "use cache: remote";
  cacheTag(CacheTags.projects);
  cacheLife("hours");
  return prisma.project.findMany({
    where: { published: true, featured: true },
    include: { tags: true },
    orderBy: { order: "asc" },
  });
}

export async function getPublishedProjectBySlug(slug: string) {
  "use cache: remote";
  cacheTag(CacheTags.projects, CacheTags.project(slug));
  cacheLife("hours");
  const project = await prisma.project.findFirst({
    where: { slug, published: true },
    include: { tags: true },
  });
  return (
    project && {
      ...project,
      descriptionTr: sanitizeOptionalHtml(project.descriptionTr),
      descriptionEn: sanitizeOptionalHtml(project.descriptionEn),
    }
  );
}

/** Slugs prerendered at build time. */
export async function getPublishedProjectSlugs(): Promise<string[]> {
  const rows = await prisma.project.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}
