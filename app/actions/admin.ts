"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import { revalidatePath } from "next/cache";
import { Project, Experience, BlogPost } from "@prisma/client";

// Middleware to check admin rights inside server actions
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Bu işlemi yapmak için yetkiniz yok.");
  }
  return user;
}

// --- PROJECTS ---
export async function getProjectById(id: string) {
  try {
    await requireAdmin();
    return await prisma.project.findUnique({
      where: { id },
      include: { tags: true }
    });
  } catch (error) {
    return null;
  }
}

export async function createProject(data: any) {
  try {
    await requireAdmin();
    const project = await prisma.project.create({
      data: {
        titleTr: data.titleTr!,
        titleEn: data.titleEn!,
        slug: data.slug!,
        summaryTr: data.summaryTr || "Özet",
        summaryEn: data.summaryEn || "Summary",
        descriptionTr: data.descriptionTr || null,
        descriptionEn: data.descriptionEn || null,
        logo: data.logo || null,
        files: data.filesList ? JSON.parse(JSON.stringify(data.filesList)) : null,
        tags: data.tagsList ? {
          connectOrCreate: data.tagsList.map((tag: any) => ({
            where: { slug: tag.slug },
            create: { 
              nameTr: tag.nameTr, 
              nameEn: tag.nameEn, 
              slug: tag.slug 
            }
          }))
        } : undefined,
        githubUrl: data.githubUrl,
        liveUrl: data.liveUrl,
        order: data.order || 0,
        published: data.published ?? true,
        featured: data.featured ?? false,
      },
    });
    revalidatePath("/admin/projects");
    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true, project };
  } catch (error: any) {
    console.error(error);
    return { error: error.message || "Proje oluşturulamadı." };
  }
}

export async function updateProject(id: string, data: any) {
  try {
    await requireAdmin();
    const project = await prisma.project.update({
      where: { id },
      data: {
        titleTr: data.titleTr,
        titleEn: data.titleEn,
        slug: data.slug,
        summaryTr: data.summaryTr,
        summaryEn: data.summaryEn,
        descriptionTr: data.descriptionTr,
        descriptionEn: data.descriptionEn,
        logo: data.logo,
        files: data.filesList ? JSON.parse(JSON.stringify(data.filesList)) : null,
        tags: data.tagsList ? {
          set: [],
          connectOrCreate: data.tagsList.map((tag: any) => ({
            where: { slug: tag.slug },
            create: { 
              nameTr: tag.nameTr, 
              nameEn: tag.nameEn, 
              slug: tag.slug 
            }
          }))
        } : undefined,
        githubUrl: data.githubUrl,
        liveUrl: data.liveUrl,
        order: data.order,
        published: data.published,
        featured: data.featured,
      },
    });
    revalidatePath("/admin/projects");
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    revalidatePath("/");
    return { success: true, project };
  } catch (error: any) {
    return { error: error.message || "Proje güncellenemedi." };
  }
}

export async function deleteProject(id: string) {
  try {
    await requireAdmin();
    await prisma.project.delete({ where: { id } });
    revalidatePath("/admin/projects");
    revalidatePath("/projects");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Proje silinemedi." };
  }
}

// --- EXPERIENCES ---
export async function getExperienceById(id: string) {
  try {
    await requireAdmin();
    return await prisma.experience.findUnique({
      where: { id },
      include: { tags: true }
    });
  } catch (error) {
    return null;
  }
}

export async function createExperience(data: any) {
  try {
    await requireAdmin();
    const experience = await prisma.experience.create({
      data: {
        company: data.company!,
        positionTr: data.positionTr!,
        positionEn: data.positionEn!,
        descriptionTr: data.descriptionTr!,
        descriptionEn: data.descriptionEn!,
        detailsTr: data.detailsTr || null,
        detailsEn: data.detailsEn || null,
        startDate: data.startDate || new Date(),
        endDate: data.endDate,
        logo: data.logo || null,
        files: data.filesList ? JSON.parse(JSON.stringify(data.filesList)) : null,
        tags: data.tagsList ? {
          connectOrCreate: data.tagsList.map((tag: any) => ({
            where: { slug: tag.slug },
            create: { 
              nameTr: tag.nameTr, 
              nameEn: tag.nameEn, 
              slug: tag.slug 
            }
          }))
        } : undefined,
        order: data.order || 0,
        published: data.published ?? true,
      },
    });
    revalidatePath("/admin/experiences");
    revalidatePath("/experience");
    return { success: true, experience };
  } catch (error: any) {
    return { error: error.message || "Deneyim oluşturulamadı." };
  }
}

export async function updateExperience(id: string, data: any) {
  try {
    await requireAdmin();
    const experience = await prisma.experience.update({
      where: { id },
      data: {
        company: data.company,
        positionTr: data.positionTr,
        positionEn: data.positionEn,
        descriptionTr: data.descriptionTr,
        descriptionEn: data.descriptionEn,
        detailsTr: data.detailsTr,
        detailsEn: data.detailsEn,
        startDate: data.startDate,
        endDate: data.endDate,
        logo: data.logo,
        files: data.filesList ? JSON.parse(JSON.stringify(data.filesList)) : null,
        tags: data.tagsList ? {
          set: [], // Clear existing relations
          connectOrCreate: data.tagsList.map((tag: any) => ({
            where: { slug: tag.slug },
            create: { 
              nameTr: tag.nameTr, 
              nameEn: tag.nameEn, 
              slug: tag.slug 
            }
          }))
        } : undefined,
        order: data.order,
        published: data.published,
      },
    });
    revalidatePath("/admin/experiences");
    revalidatePath("/experience");
    revalidatePath(`/experience/${id}`);
    return { success: true, experience };
  } catch (error: any) {
    return { error: error.message || "Deneyim güncellenemedi." };
  }
}

export async function deleteExperience(id: string) {
  try {
    await requireAdmin();
    await prisma.experience.delete({ where: { id } });
    revalidatePath("/admin/experiences");
    revalidatePath("/experience");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Deneyim silinemedi." };
  }
}

// --- BLOG POSTS ---
export async function getBlogPostById(id: string) {
  try {
    await requireAdmin();
    return await prisma.blogPost.findUnique({
      where: { id },
      include: { tags: true }
    });
  } catch (error) {
    return null;
  }
}

export async function createBlogPost(data: any) {
  try {
    const admin = await requireAdmin();
    const post = await prisma.blogPost.create({
      data: {
        titleTr: data.titleTr!,
        titleEn: data.titleEn!,
        slug: data.slug!,
        excerptTr: data.excerptTr!,
        excerptEn: data.excerptEn!,
        contentTr: data.contentTr!,
        contentEn: data.contentEn!,
        coverImage: data.coverImage,
        files: data.filesList ? JSON.parse(JSON.stringify(data.filesList)) : null,
        tags: data.tagsList ? {
          connectOrCreate: data.tagsList.map((tag: any) => ({
            where: { slug: tag.slug },
            create: { 
              nameTr: tag.nameTr, 
              nameEn: tag.nameEn, 
              slug: tag.slug 
            }
          }))
        } : undefined,
        published: data.published ?? true,
        featured: data.featured ?? false,
        authorId: admin.id,
        viewCount: 0,
      },
    });
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath("/");
    return { success: true, post };
  } catch (error: any) {
    console.error("Blog creation error:", error);
    return { error: error.message || "Yazı oluşturulamadı." };
  }
}

export async function updateBlogPost(id: string, data: any) {
  try {
    await requireAdmin();
    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        titleTr: data.titleTr,
        titleEn: data.titleEn,
        slug: data.slug,
        excerptTr: data.excerptTr,
        excerptEn: data.excerptEn,
        contentTr: data.contentTr,
        contentEn: data.contentEn,
        coverImage: data.coverImage,
        files: data.filesList ? JSON.parse(JSON.stringify(data.filesList)) : null,
        tags: data.tagsList ? {
          set: [],
          connectOrCreate: data.tagsList.map((tag: any) => ({
            where: { slug: tag.slug },
            create: { 
              nameTr: tag.nameTr, 
              nameEn: tag.nameEn, 
              slug: tag.slug 
            }
          }))
        } : undefined,
        published: data.published,
        featured: data.featured,
      },
    });
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);
    revalidatePath("/");
    return { success: true, post };
  } catch (error: any) {
    return { error: error.message || "Yazı güncellenemedi." };
  }
}

export async function deleteBlogPost(id: string) {
  try {
    await requireAdmin();
    await prisma.blogPost.delete({ where: { id } });
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Yazı silinemedi." };
  }
}

// --- CONTACT MESSAGES ---
export async function getContactMessages() {
  try {
    await requireAdmin();
    return await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    return [];
  }
}

export async function deleteContactMessage(id: string) {
  try {
    await requireAdmin();
    await prisma.contactMessage.delete({ where: { id } });
    revalidatePath("/admin/contacts");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Mesaj silinemedi." };
  }
}
