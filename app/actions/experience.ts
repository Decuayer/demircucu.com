"use server";

import { prisma } from "@/lib/prisma";

export async function getExperiences() {
  return await prisma.experience.findMany({
    where: { published: true },
    orderBy: { startDate: "desc" },
    include: { tags: true },
  });
}

export async function getExperienceById(id: string) {  
  return await prisma.experience.findFirst({
    where: { 
      id: id, 
      published: true 
    },
    include: { 
      tags: true 
    },
  });
}

export async function getAllExperiencesForAdmin() {
  return await prisma.experience.findMany({
    orderBy: { order: "asc" },
  });
}
