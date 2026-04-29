"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getProjects() {
  return await prisma.project.findMany({
    where: { published: true },
    include: { tags: true },
    orderBy: { order: "asc" },
  });
}

export async function getFeaturedProjects() {
  return await prisma.project.findMany({
    where: { published: true, featured: true },
    include: { tags: true },
    orderBy: { order: "asc" },
  });
}

export async function getProjectBySlug(slug: string) {
  return await prisma.project.findUnique({
    where: { slug, published: true },
    include: { tags: true },
  });
}

export async function getProjectById(id: string) {
  return await prisma.project.findUnique({
    where: { id, published: true },
    include: { tags: true },
  });
}

export async function getAllProjectsForAdmin() {
  return await prisma.project.findMany({
    include: { tags: true },
    orderBy: { order: "asc" },
  });
}
