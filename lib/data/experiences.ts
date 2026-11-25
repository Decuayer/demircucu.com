import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CacheTags } from "@/lib/cache/tags";
import { sanitizeOptionalHtml } from "@/lib/sanitize/html";
import { optimizeImagesIn } from "@/lib/data/html-images";
import { presentExperience, publicExperienceQuery } from "@/lib/data/present";

export async function getPublishedExperiences() {
  "use cache: remote";
  cacheTag(CacheTags.experiences);
  cacheLife("hours");
  const rows = await prisma.experience.findMany({
    ...publicExperienceQuery,
    where: { published: true },
    orderBy: { startDate: "desc" },
  });
  return rows.map(presentExperience);
}

export async function getPublishedExperience(id: string) {
  "use cache: remote";
  cacheTag(CacheTags.experiences, CacheTags.experience(id));
  cacheLife("hours");
  const row = await prisma.experience.findFirst({
    ...publicExperienceQuery,
    where: { id, published: true },
  });
  const experience = row && presentExperience(row);
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
