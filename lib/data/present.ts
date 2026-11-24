import "server-only";
import type { Prisma } from "@prisma/client";
import { mediaUrl } from "@/lib/media/url";
import { flattenTags, visibleTagsInclude } from "@/lib/tags/view";

/**
 * Shapes content rows for public pages: visible tags flattened to `Tag[]`, media paths resolved
 * to public URLs, override fields resolved against GitHub data, and columns no page needs
 * (raw README markdown, sync bookkeeping, BigInt repo id) left out.
 */

export const publicProjectQuery = {
  omit: {
    githubRepoId: true,
    readmeMarkdown: true,
    readmeHtml: true,
    readmeVersion: true,
    readmeSha: true,
    readmeEtag: true,
    languagesEtag: true,
    treeSha: true,
    syncError: true,
  },
  include: { tags: visibleTagsInclude },
} satisfies Prisma.ProjectFindManyArgs;

export const publicExperienceQuery = {
  include: { tags: visibleTagsInclude },
} satisfies Prisma.ExperienceFindManyArgs;

export const publicPostQuery = {
  include: { tags: visibleTagsInclude },
} satisfies Prisma.BlogPostFindManyArgs;

type ProjectRow = Prisma.ProjectGetPayload<typeof publicProjectQuery>;
type ExperienceRow = Prisma.ExperienceGetPayload<typeof publicExperienceQuery>;
type PostRow = Prisma.BlogPostGetPayload<typeof publicPostQuery>;

/** Repository name of "owner/name". */
const repoName = (fullName: string | null) => fullName?.split("/").pop() ?? null;

export function presentProject(row: ProjectRow) {
  const fallbackTitle = repoName(row.githubFullName) ?? row.slug;
  const fallbackSummary = row.githubDescription ?? "";
  return {
    ...row,
    titleTr: row.titleTr || row.titleEn || fallbackTitle,
    titleEn: row.titleEn || row.titleTr || fallbackTitle,
    summaryTr: row.summaryTr || row.summaryEn || fallbackSummary,
    summaryEn: row.summaryEn || row.summaryTr || fallbackSummary,
    // The repository's website when the admin set no live URL.
    liveUrl: row.liveUrl || row.homepage,
    logoUrl: mediaUrl(row.logoPath),
    tags: flattenTags(row.tags),
  };
}

export function presentExperience(row: ExperienceRow) {
  return { ...row, logoUrl: mediaUrl(row.logoPath), tags: flattenTags(row.tags) };
}

export function presentPost(row: PostRow) {
  return { ...row, coverUrl: mediaUrl(row.coverPath), tags: flattenTags(row.tags) };
}

export type PublicProject = ReturnType<typeof presentProject>;
export type PublicExperience = ReturnType<typeof presentExperience>;
export type PublicPost = ReturnType<typeof presentPost>;
