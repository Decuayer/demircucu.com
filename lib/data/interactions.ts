import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CacheTags } from "@/lib/cache/tags";

/** Public comments and like count of a post. Shared by every visitor, so cached. */
export async function getPostEngagement(postId: string) {
  "use cache: remote";
  cacheTag(CacheTags.postInteractions(postId));
  cacheLife("hours");
  const [comments, likesCount] = await Promise.all([
    prisma.comment.findMany({
      where: { postId, hidden: false },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.like.count({ where: { postId } }),
  ]);
  return { comments, likesCount };
}

/** Per-user state; never cached across requests. */
export async function hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
  const like = await prisma.like.findUnique({
    where: { postId_userId: { postId, userId } },
    select: { id: true },
  });
  return like !== null;
}

/** Published post id for a slug-less lookup by id (used by interaction actions). */
export async function findPublishedPost(postId: string) {
  return prisma.blogPost.findFirst({
    where: { id: postId, published: true },
    select: { id: true, slug: true },
  });
}
