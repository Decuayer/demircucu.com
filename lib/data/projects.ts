import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CacheTags } from "@/lib/cache/tags";
import { sanitizeOptionalHtml } from "@/lib/sanitize/html";
import { presentProject, publicProjectQuery } from "@/lib/data/present";

export async function getPublishedProjects() {
  "use cache: remote";
  cacheTag(CacheTags.projects);
  cacheLife("hours");
  const rows = await prisma.project.findMany({
    ...publicProjectQuery,
    where: { published: true },
    orderBy: { order: "asc" },
  });
  return rows.map(presentProject);
}

export async function getFeaturedProjects() {
  "use cache: remote";
  cacheTag(CacheTags.projects);
  cacheLife("hours");
  const rows = await prisma.project.findMany({
    ...publicProjectQuery,
    where: { published: true, featured: true },
    orderBy: { order: "asc" },
  });
  return rows.map(presentProject);
}

export async function getPublishedProjectBySlug(slug: string) {
  "use cache: remote";
  cacheTag(CacheTags.projects, CacheTags.project(slug));
  cacheLife("hours");
  const row = await prisma.project.findFirst({
    ...publicProjectQuery,
    where: { slug, published: true },
  });
  const project = row && presentProject(row);
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
