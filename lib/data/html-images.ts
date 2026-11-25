import "server-only";
import { prisma } from "@/lib/prisma";
import { optimizeHtmlImages, type KnownSize } from "@/lib/media/html-images";
import { mediaPathsInHtml } from "@/lib/media/url";

/**
 * Optimises the `<img>` tags of sanitised HTML fields (lib/media/html-images.ts) with the stored
 * dimensions of our media files: one query for all fields of a page.
 */
export async function optimizeImagesIn<T extends Record<string, string | null | undefined>>(
  fields: T,
): Promise<T> {
  const paths = [...new Set(Object.values(fields).flatMap((html) => mediaPathsInHtml(html)))];
  const files = paths.length
    ? await prisma.mediaFile.findMany({
        where: { path: { in: paths } },
        select: { path: true, width: true, height: true },
      })
    : [];
  const sizes = new Map<string, KnownSize>(files.map((f) => [f.path, f]));
  return Object.fromEntries(
    Object.entries(fields).map(([key, html]) => [
      key,
      html ? optimizeHtmlImages(html, sizes) : html,
    ]),
  ) as T;
}
