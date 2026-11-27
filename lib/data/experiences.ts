import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CacheTags } from "@/lib/cache/tags";
import { sanitizeOptionalHtml } from "@/lib/sanitize/html";
import { optimizeImagesIn } from "@/lib/data/html-images";
import { presentExperience, publicExperienceQuery } from "@/lib/data/present";
import { calendarMonths } from "@/lib/experience/duration";

/** Length in calendar months; an ongoing role counts until today (cached for hours). */
const withMonths = <T extends { startDate: Date; endDate: Date | null }>(row: T, now: Date) => ({
  ...row,
  months: calendarMonths(row.startDate, row.endDate ?? now),
});

export async function getPublishedExperiences() {
  "use cache: remote";
  cacheTag(CacheTags.experiences);
  cacheLife("hours");
  const rows = await prisma.experience.findMany({
    ...publicExperienceQuery,
    where: { published: true },
    orderBy: { startDate: "desc" },
  });
  const now = new Date();
  return rows.map((row) => withMonths(presentExperience(row), now));
}

export async function getPublishedExperience(id: string) {
  "use cache: remote";
  cacheTag(CacheTags.experiences, CacheTags.experience(id));
  cacheLife("hours");
  const row = await prisma.experience.findFirst({
    ...publicExperienceQuery,
    where: { id, published: true },
  });
  const experience = row && withMonths(presentExperience(row), new Date());
  if (!experience) return null;
  return {
    ...experience,
    ...(await optimizeImagesIn({
      detailsTr: sanitizeOptionalHtml(experience.detailsTr),
      detailsEn: sanitizeOptionalHtml(experience.detailsEn),
    })),
  };
}

export async function getPublishedExperienceIds(): Promise<string[]> {
  const rows = await prisma.experience.findMany({
    where: { published: true },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}
