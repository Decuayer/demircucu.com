import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { CacheTags } from "@/lib/cache/tags";
import { getAppUrl } from "@/lib/env/app-url";
import { getPublishedExperienceIds } from "@/lib/data/experiences";
import { getPublishedPostSlugs } from "@/lib/data/posts";
import { getPublishedProjectSlugs } from "@/lib/data/projects";
import { getSkillSlugs } from "@/lib/data/skills";

/** Published content only (unknown or draft slugs never appear; see e2e/smoke.spec.ts). */
async function sitemapPaths(): Promise<string[]> {
  "use cache: remote";
  cacheTag(CacheTags.projects, CacheTags.experiences, CacheTags.posts, CacheTags.tags);
  cacheLife("hours");
  const [projects, experiences, posts, skills] = await Promise.all([
    getPublishedProjectSlugs(),
    getPublishedExperienceIds(),
    getPublishedPostSlugs(),
    getSkillSlugs(),
  ]);
  return [
    "/",
    "/about",
    "/experience",
    "/projects",
    "/blog",
    "/skills",
    "/contact",
    ...projects.map((slug) => `/projects/${slug}`),
    ...experiences.map((id) => `/experience/${id}`),
    ...posts.map((slug) => `/blog/${slug}`),
    ...skills.map((slug) => `/skills/${slug}`),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();
  const paths = await sitemapPaths();
  return paths.map((href) => ({
    url: new URL(getPathname({ locale: routing.defaultLocale, href }), base).toString(),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [
          locale,
          new URL(getPathname({ locale, href }), base).toString(),
        ]),
      ),
    },
  }));
}
