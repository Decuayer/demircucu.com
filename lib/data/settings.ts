import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CacheTags } from "@/lib/cache/tags";
import { sanitizeOptionalHtml } from "@/lib/sanitize/html";
import { mediaUrl } from "@/lib/media/url";
import { optimizeImagesIn } from "@/lib/data/html-images";

/**
 * Site settings for public pages. Cached across requests and invalidated by
 * `updateSiteSettings` through the `settings` tag.
 *
 * Read-only: the row is created by the seed (and by the first admin save), never on a read path,
 * so builds and anonymous requests never write. Returns null on an empty database.
 */
export async function getSiteSettings() {
  "use cache: remote";
  cacheTag(CacheTags.settings);
  cacheLife("hours");
  const row = await prisma.siteSettings.findUnique({
    where: { id: "main" },
    include: { aboutPhotoMedia: { select: { blurDataUrl: true } } },
  });
  if (!row) return null;
  const { aboutPhotoMedia, ...settings } = row;
  return {
    ...settings,
    aboutPhotoUrl: mediaUrl(settings.aboutPhotoPath),
    aboutPhotoBlur: aboutPhotoMedia?.blurDataUrl ?? null,
    faviconUrl: mediaUrl(settings.faviconPath),
    ...(await optimizeImagesIn({
      aboutBioTr: sanitizeOptionalHtml(settings.aboutBioTr),
      aboutBioEn: sanitizeOptionalHtml(settings.aboutBioEn),
    })),
  };
}

export type PublicSiteSettings = NonNullable<Awaited<ReturnType<typeof getSiteSettings>>>;

/** Current calendar year, refreshed daily; keeps the footer free of request-time `new Date()`. */
export async function getCurrentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getUTCFullYear();
}
