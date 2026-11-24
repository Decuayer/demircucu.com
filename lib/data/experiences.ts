import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CacheTags } from "@/lib/cache/tags";
import { sanitizeOptionalHtml } from "@/lib/sanitize/html";

export async function getPublishedExperiences() {
  "use cache";
  cacheTag(CacheTags.experiences);
  cacheLife("hours");
  return prisma.experience.findMany({
    where: { published: true },
    orderBy: { startDate: "desc" },
    include: { tags: true },
  });
}

export async function getPublishedExperience(id: string) {
  "use cache";
  cacheTag(CacheTags.experiences, CacheTags.experience(id));
  cacheLife("hours");
  const experience = await prisma.experience.findFirst({
    where: { id, published: true },
    include: { tags: true },
  });
  return (
    experience && {
      ...experience,
      detailsTr: sanitizeOptionalHtml(experience.detailsTr),
      detailsEn: sanitizeOptionalHtml(experience.detailsEn),
    }
  );
}

export async function getPublishedExperienceIds(): Promise<string[]> {
  const rows = await prisma.experience.findMany({
    where: { published: true },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}
