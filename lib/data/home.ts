import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CacheTags } from "@/lib/cache/tags";
import { mediaPathFromUrl, mediaUrl } from "@/lib/media/url";
import { firstReadmeImagePath, pickCover, type CoverMedia } from "@/lib/projects/cover";
import { MAX_FEATURED_PROJECTS } from "@/lib/home/layout";
import { monthsBetween } from "@/lib/home/duration";
import { readingMinutes } from "@/lib/reading-time";
import { topSkills } from "@/lib/tags/tree";
import {
  presentExperience,
  presentPost,
  presentProject,
  publicExperienceQuery,
  publicPostQuery,
  publicProjectQuery,
} from "./present";
import { getSkillForest } from "./skills";

/** Featured projects (admin order, at most four) with a cover image when one is available. */
export async function getHomeProjects() {
  "use cache: remote";
  cacheTag(CacheTags.projects);
  cacheLife("hours");
  const rows = await prisma.project.findMany({
    ...publicProjectQuery,
    omit: { ...publicProjectQuery.omit, readmeHtml: false },
    where: { published: true, featured: true },
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
    take: MAX_FEATURED_PROJECTS,
  });
  const readmePaths = new Map(
    rows.map((row) => [
      row.id,
      firstReadmeImagePath(row.readmeHtml, (url) => mediaPathFromUrl(url)),
    ]),
  );
  const paths = rows
    .flatMap((row) => [row.logoPath, readmePaths.get(row.id)])
    .filter((path): path is string => !!path);
  const files = await prisma.mediaFile.findMany({
    where: { path: { in: paths } },
    select: { path: true, width: true, height: true, blurDataUrl: true },
  });
  const media = new Map<string, CoverMedia>(files.map((file) => [file.path, file]));
  return rows.map(({ readmeHtml: _readme, ...row }) => {
    const cover = pickCover(row.logoPath, readmePaths.get(row.id) ?? null, media);
    return { ...presentProject(row), cover: cover && { ...cover, url: mediaUrl(cover.path) } };
  });
}

/** The three most recent experiences, with their length in months (ongoing: until today). */
export async function getHomeExperiences() {
  "use cache: remote";
  cacheTag(CacheTags.experiences);
  cacheLife("hours");
  const rows = await prisma.experience.findMany({
    ...publicExperienceQuery,
    where: { published: true },
    orderBy: { startDate: "desc" },
    take: 3,
  });
  const now = new Date();
  return rows.map((row) => ({
    ...presentExperience(row),
    months: monthsBetween(row.startDate, row.endDate ?? now),
  }));
}

export interface HomeSkill {
  slug: string;
  name: string;
  nameTr: string | null;
  nameEn: string | null;
  icon: string | null;
}

/** Skills marked as featured by the admin; without any, the twelve most used. */
export async function getHomeSkills(): Promise<{
  source: "featured" | "usage";
  skills: HomeSkill[];
}> {
  "use cache: remote";
  cacheTag(CacheTags.tags);
  cacheLife("hours");
  const select = { slug: true, name: true, nameTr: true, nameEn: true, icon: true } as const;
  const featured = await prisma.tag.findMany({
    where: { featured: true, isSkill: true, hidden: false },
    select,
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  if (featured.length > 0) return { source: "featured", skills: featured };
  const ranked = topSkills(await getSkillForest(), 12);
  return {
    source: "usage",
    skills: ranked.map(({ slug, name, nameTr, nameEn, icon }) => ({
      slug,
      name,
      nameTr,
      nameEn,
      icon,
    })),
  };
}

/** The three newest posts (by date), with reading time per language. */
export async function getHomePosts() {
  "use cache: remote";
  cacheTag(CacheTags.posts);
  cacheLife("hours");
  const rows = await prisma.blogPost.findMany({
    ...publicPostQuery,
    where: { published: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  // The list shows excerpts only; full contents stay on the server.
  return rows.map((row) => {
    const { contentTr: _tr, contentEn: _en, ...post } = presentPost(row);
    return {
      ...post,
      minutesTr: readingMinutes(row.contentTr),
      minutesEn: readingMinutes(row.contentEn),
    };
  });
}

export type HomeProject = Awaited<ReturnType<typeof getHomeProjects>>[number];
export type HomeExperience = Awaited<ReturnType<typeof getHomeExperiences>>[number];
export type HomePost = Awaited<ReturnType<typeof getHomePosts>>[number];
