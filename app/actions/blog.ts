"use server";

import { prisma } from "@/lib/prisma";

export async function getBlogPosts() {
  return await prisma.blogPost.findMany({
    where: { published: true },
    include: { tags: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFeaturedBlogPosts(limit: number = 3) {
  return await prisma.blogPost.findMany({
    where: { published: true },
    include: { tags: true },
    orderBy: { viewCount: "desc" },
    take: limit,
  });
}

export async function getBlogPostBySlug(slug: string) {
  return await prisma.blogPost.findFirst({
    where: {
      slug: slug,
      published: true
    },
    include: { tags: true },
  });
}

export async function incrementViewCount(slug: string) {
  return await prisma.blogPost.update({
    where: { slug },
    data: {
      viewCount: { increment: 1 }
    }
  });
}

export async function getAllBlogPostsForAdmin() {
  return await prisma.blogPost.findMany({
    include: { tags: true },
    orderBy: { createdAt: "desc" },
  });
}
