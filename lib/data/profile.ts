import "server-only";
import { prisma } from "@/lib/prisma";

export async function getUserActivity(userId: string) {
  const [likes, comments] = await Promise.all([
    prisma.like.findMany({
      where: { userId },
      include: {
        post: {
          select: { id: true, titleTr: true, titleEn: true, slug: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.comment.findMany({
      where: { authorId: userId },
      include: { post: { select: { titleTr: true, titleEn: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { likes, comments };
}
