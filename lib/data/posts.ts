import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CacheTags } from "@/lib/cache/tags";
import { sanitizeHtml } from "@/lib/sanitize/html";
import { presentPost, publicPostQuery } from "@/lib/data/present";

export async function getPublishedPosts() {
  "use cache: remote";
  cacheTag(CacheTags.posts);
  cacheLife("hours");
  const rows = await prisma.blogPost.findMany({
    ...publicPostQuery,
    where: { published: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(presentPost);
}

/** Home page list. Ordering by views is revisited in the design phase (task doc 2.3). */
export async function getFeaturedPosts(limit = 3) {
  "use cache: remote";
  cacheTag(CacheTags.posts);
  cacheLife("hours");
  const rows = await prisma.blogPost.findMany({
    ...publicPostQuery,
    where: { published: true },
    orderBy: { viewCount: "desc" },
    take: limit,
  });
  return rows.map(presentPost);
}

export async function getPublishedPostBySlug(slug: string) {
  "use cache: remote";
  cacheTag(CacheTags.posts, CacheTags.post(slug));
  cacheLife("hours");
  const row = await prisma.blogPost.findFirst({
    ...publicPostQuery,
    where: { slug, published: true },
  });
  const post = row && presentPost(row);
  // Rendered with dangerouslySetInnerHTML: sanitize again on read (rows may predate S4).
  return (
    post && {
      ...post,
      contentTr: sanitizeHtml(post.contentTr),
      contentEn: sanitizeHtml(post.contentEn),
    }
  );
}

export async function getPublishedPostSlugs(): Promise<string[]> {
  const rows = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}
