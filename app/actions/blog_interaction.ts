"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import { revalidatePath } from "next/cache";

export async function addComment(postId: string, content: string, pathToRevalidate: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Yorum yapmak için giriş yapmalısınız." };
  }

  if (!content || content.trim().length === 0) {
    return { error: "Yorum boş olamaz." };
  }

  try {
    await prisma.comment.create({
      data: {
        content: content.trim(),
        postId,
        authorId: user.id,
      },
    });

    revalidatePath(pathToRevalidate);
    return { success: true };
  } catch (error) {
    console.error("Add comment error:", error);
    return { error: "Yorum eklenirken bir hata oluştu." };
  }
}

export async function toggleLike(postId: string, pathToRevalidate: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Beğenmek için giriş yapmalısınız." };
  }

  try {
    const existingLike = await prisma.like.findFirst({
      where: {
        postId,
        userId: user.id,
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
    } else {
      // Like
      await prisma.like.create({
        data: {
          postId,
          userId: user.id,
        },
      });
    }

    revalidatePath(pathToRevalidate);
    return { success: true };
  } catch (error) {
    console.error("Toggle like error:", error);
    return { error: "Beğeni işlemi başarısız oldu." };
  }
}

export async function getPostInteractions(postId: string) {
  const [comments, likesCount] = await Promise.all([
    prisma.comment.findMany({
      where: { postId },
      include: {
        author: {
          select: { name: true, id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.like.count({
      where: { postId },
    }),
  ]);

  let userLiked = false;
  const user = await getCurrentUser();
  if (user) {
    const like = await prisma.like.findFirst({
      where: { postId, userId: user.id },
    });
    if (like) userLiked = true;
  }

  return { comments, likesCount, userLiked };
}
