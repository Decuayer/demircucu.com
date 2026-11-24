"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/guards";
import { invalidate } from "@/lib/cache/tags";
import { ok, toActionFailure, type ActionResult } from "@/lib/actions/result";
import { id as idSchema } from "@/lib/validation/common";
import {
  blogPostSchema,
  experienceSchema,
  projectSchema,
  type BlogPostInput,
  type ExperienceInput,
  type ProjectInput,
  type TagInput,
} from "@/lib/validation/content";
import { z } from "zod";

/**
 * Resolves the tag selector's free-text tags to existing tags (by slug, then by either name) and
 * creates only the ones that are really new. The selector derives slugs from names
 * ("Next.js" -> "next-js"), which used to miss the existing "nextjs" tag and then fail on the
 * unique name. Replaced by the canonical tag system in Phase 4.
 */
async function connectTags(tags: TagInput[] | undefined, replace: boolean) {
  if (!tags) return undefined;
  const existing = await prisma.tag.findMany({
    where: {
      OR: [
        { slug: { in: tags.map((t) => t.slug) } },
        { nameTr: { in: tags.map((t) => t.nameTr) } },
        { nameEn: { in: tags.map((t) => t.nameEn) } },
      ],
    },
    select: { id: true, slug: true, nameTr: true, nameEn: true },
  });
  const connect: { id: string }[] = [];
  const create: TagInput[] = [];
  for (const tag of tags) {
    const match = existing.find(
      (e) => e.slug === tag.slug || e.nameTr === tag.nameTr || e.nameEn === tag.nameEn,
    );
    if (match) connect.push({ id: match.id });
    else if (!create.some((c) => c.slug === tag.slug)) create.push(tag);
  }
  return {
    ...(replace ? { set: [] } : {}),
    connect,
    create: create.map(({ slug, nameTr, nameEn }) => ({ slug, nameTr, nameEn })),
  };
}

function filesJson(files: { name: string; url: string; type?: string }[] | undefined) {
  return files ? (files as Prisma.InputJsonValue) : undefined;
}

// --- PROJECTS -------------------------------------------------------------------------------

export async function createProject(input: ProjectInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const { tagsList, filesList, ...data } = projectSchema.parse(input);
    const project = await prisma.project.create({
      data: { ...data, files: filesJson(filesList), tags: await connectTags(tagsList, false) },
      select: { id: true, slug: true },
    });
    invalidate({ entity: "project", slug: project.slug });
    return ok({ id: project.id });
  } catch (error) {
    return toActionFailure(error, "createProject");
  }
}

export async function updateProject(idInput: string, input: ProjectInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    const { tagsList, filesList, ...data } = projectSchema.parse(input);
    const previous = await prisma.project.findUniqueOrThrow({
      where: { id },
      select: { slug: true },
    });
    const project = await prisma.project.update({
      where: { id },
      data: { ...data, files: filesJson(filesList), tags: await connectTags(tagsList, true) },
      select: { slug: true },
    });
    invalidate({ entity: "project", slug: project.slug, previousSlug: previous.slug });
    return ok();
  } catch (error) {
    return toActionFailure(error, "updateProject");
  }
}

export async function deleteProject(idInput: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    const project = await prisma.project.delete({ where: { id }, select: { slug: true } });
    invalidate({ entity: "project", slug: project.slug });
    return ok();
  } catch (error) {
    return toActionFailure(error, "deleteProject");
  }
}

// --- EXPERIENCES ----------------------------------------------------------------------------

export async function createExperience(
  input: ExperienceInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const { tagsList, filesList, endDate, ...data } = experienceSchema.parse(input);
    const experience = await prisma.experience.create({
      data: {
        ...data,
        endDate: endDate ?? null,
        files: filesJson(filesList),
        tags: await connectTags(tagsList, false),
      },
      select: { id: true },
    });
    invalidate({ entity: "experience", id: experience.id });
    return ok({ id: experience.id });
  } catch (error) {
    return toActionFailure(error, "createExperience");
  }
}

export async function updateExperience(
  idInput: string,
  input: ExperienceInput,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    const { tagsList, filesList, endDate, ...data } = experienceSchema.parse(input);
    await prisma.experience.update({
      where: { id },
      data: {
        ...data,
        // The form omits endDate for ongoing positions; clear it instead of keeping the old one.
        endDate: endDate ?? null,
        files: filesJson(filesList),
        tags: await connectTags(tagsList, true),
      },
    });
    invalidate({ entity: "experience", id });
    return ok();
  } catch (error) {
    return toActionFailure(error, "updateExperience");
  }
}

export async function deleteExperience(idInput: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    await prisma.experience.delete({ where: { id } });
    invalidate({ entity: "experience", id });
    return ok();
  } catch (error) {
    return toActionFailure(error, "deleteExperience");
  }
}

// --- BLOG POSTS -----------------------------------------------------------------------------

export async function createBlogPost(input: BlogPostInput): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireAdmin();
    const { tagsList, filesList, ...data } = blogPostSchema.parse(input);
    const post = await prisma.blogPost.create({
      data: {
        ...data,
        files: filesJson(filesList),
        tags: await connectTags(tagsList, false),
        authorId: admin.id,
      },
      select: { id: true, slug: true },
    });
    invalidate({ entity: "post", slug: post.slug });
    return ok({ id: post.id });
  } catch (error) {
    return toActionFailure(error, "createBlogPost");
  }
}

export async function updateBlogPost(idInput: string, input: BlogPostInput): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    const { tagsList, filesList, ...data } = blogPostSchema.parse(input);
    const previous = await prisma.blogPost.findUniqueOrThrow({
      where: { id },
      select: { slug: true },
    });
    const post = await prisma.blogPost.update({
      where: { id },
      data: { ...data, files: filesJson(filesList), tags: await connectTags(tagsList, true) },
      select: { slug: true },
    });
    invalidate(
      { entity: "post", slug: post.slug, previousSlug: previous.slug },
      { entity: "postInteractions", postId: id },
    );
    return ok();
  } catch (error) {
    return toActionFailure(error, "updateBlogPost");
  }
}

export async function deleteBlogPost(idInput: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    const post = await prisma.blogPost.delete({ where: { id }, select: { slug: true } });
    invalidate({ entity: "post", slug: post.slug }, { entity: "postInteractions", postId: id });
    return ok();
  } catch (error) {
    return toActionFailure(error, "deleteBlogPost");
  }
}

// --- COMMENT MODERATION ---------------------------------------------------------------------

const moderationSchema = z.object({ id: idSchema, hidden: z.boolean() });

export async function setCommentHidden(
  input: z.input<typeof moderationSchema>,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { id, hidden } = moderationSchema.parse(input);
    const comment = await prisma.comment.update({
      where: { id },
      data: { hidden },
      select: { postId: true },
    });
    invalidate({ entity: "postInteractions", postId: comment.postId });
    return ok();
  } catch (error) {
    return toActionFailure(error, "setCommentHidden");
  }
}

export async function deleteComment(idInput: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    const comment = await prisma.comment.delete({ where: { id }, select: { postId: true } });
    invalidate({ entity: "postInteractions", postId: comment.postId });
    return ok();
  } catch (error) {
    return toActionFailure(error, "deleteComment");
  }
}

// --- CONTACT MESSAGES -----------------------------------------------------------------------

export async function deleteContactMessage(idInput: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const id = idSchema.parse(idInput);
    await prisma.contactMessage.delete({ where: { id } });
    invalidate({ entity: "contactMessage" });
    return ok();
  } catch (error) {
    return toActionFailure(error, "deleteContactMessage");
  }
}
