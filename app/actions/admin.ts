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
} from "@/lib/validation/content";
import { attachmentPaths, type Attachment } from "@/lib/media/attachments";
import { mediaPathsInHtml } from "@/lib/media/url";
import { clearMediaUsage, syncMediaUsage } from "@/lib/media/usage";
import { applyContentTags } from "@/lib/tags/content-tags";
import { z } from "zod";

function filesJson(files: Attachment[] | undefined) {
  return files ? (files as Prisma.InputJsonValue) : undefined;
}

const htmlPaths = (...html: (string | null | undefined)[]) =>
  html.flatMap((h) => mediaPathsInHtml(h));

// --- PROJECTS -------------------------------------------------------------------------------

export async function createProject(input: ProjectInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const { tagIds, hiddenTagIds, filesList, ...data } = projectSchema.parse(input);
    const files: Attachment[] | undefined = filesList;
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: { ...data, files: filesJson(files) },
        select: { id: true, slug: true },
      });
      await applyContentTags(tx, "project", created.id, { tagIds, hiddenTagIds });
      await syncMediaUsage(tx, "PROJECT", created.id, {
        required: { files: attachmentPaths(files) },
        optional: { description: htmlPaths(data.descriptionTr, data.descriptionEn) },
      });
      return created;
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
    const { tagIds, hiddenTagIds, filesList, ...data } = projectSchema.parse(input);
    const files: Attachment[] | undefined = filesList;
    const { previous, project } = await prisma.$transaction(async (tx) => {
      const previous = await tx.project.findUniqueOrThrow({
        where: { id },
        select: { slug: true },
      });
      const project = await tx.project.update({
        where: { id },
        data: { ...data, files: filesJson(files) },
        select: { slug: true },
      });
      await applyContentTags(tx, "project", id, { tagIds, hiddenTagIds });
      await syncMediaUsage(tx, "PROJECT", id, {
        required: { files: attachmentPaths(files) },
        optional: { description: htmlPaths(data.descriptionTr, data.descriptionEn) },
      });
      return { previous, project };
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
    const project = await prisma.$transaction(async (tx) => {
      await clearMediaUsage(tx, "PROJECT", id);
      return tx.project.delete({ where: { id }, select: { slug: true } });
    });
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
    const { tagIds, hiddenTagIds, filesList, endDate, ...data } = experienceSchema.parse(input);
    const files: Attachment[] | undefined = filesList;
    const experience = await prisma.$transaction(async (tx) => {
      const created = await tx.experience.create({
        data: { ...data, endDate: endDate ?? null, files: filesJson(files) },
        select: { id: true },
      });
      await applyContentTags(tx, "experience", created.id, { tagIds, hiddenTagIds });
      await syncMediaUsage(tx, "EXPERIENCE", created.id, {
        required: { files: attachmentPaths(files) },
        optional: { details: htmlPaths(data.detailsTr, data.detailsEn) },
      });
      return created;
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
    const { tagIds, hiddenTagIds, filesList, endDate, ...data } = experienceSchema.parse(input);
    const files: Attachment[] | undefined = filesList;
    await prisma.$transaction(async (tx) => {
      await tx.experience.update({
        where: { id },
        data: {
          ...data,
          // The form omits endDate for ongoing positions; clear it instead of keeping the old one.
          endDate: endDate ?? null,
          files: filesJson(files),
        },
      });
      await applyContentTags(tx, "experience", id, { tagIds, hiddenTagIds });
      await syncMediaUsage(tx, "EXPERIENCE", id, {
        required: { files: attachmentPaths(files) },
        optional: { details: htmlPaths(data.detailsTr, data.detailsEn) },
      });
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
    await prisma.$transaction(async (tx) => {
      await clearMediaUsage(tx, "EXPERIENCE", id);
      await tx.experience.delete({ where: { id } });
    });
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
    const { tagIds, hiddenTagIds, filesList, ...data } = blogPostSchema.parse(input);
    const files: Attachment[] | undefined = filesList;
    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.blogPost.create({
        data: { ...data, files: filesJson(files), authorId: admin.id },
        select: { id: true, slug: true },
      });
      await applyContentTags(tx, "blogPost", created.id, { tagIds, hiddenTagIds });
      await syncMediaUsage(tx, "BLOG_POST", created.id, {
        required: { files: attachmentPaths(files) },
        optional: { content: htmlPaths(data.contentTr, data.contentEn) },
      });
      return created;
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
    const { tagIds, hiddenTagIds, filesList, ...data } = blogPostSchema.parse(input);
    const files: Attachment[] | undefined = filesList;
    const { previous, post } = await prisma.$transaction(async (tx) => {
      const previous = await tx.blogPost.findUniqueOrThrow({
        where: { id },
        select: { slug: true },
      });
      const post = await tx.blogPost.update({
        where: { id },
        data: { ...data, files: filesJson(files) },
        select: { slug: true },
      });
      await applyContentTags(tx, "blogPost", id, { tagIds, hiddenTagIds });
      await syncMediaUsage(tx, "BLOG_POST", id, {
        required: { files: attachmentPaths(files) },
        optional: { content: htmlPaths(data.contentTr, data.contentEn) },
      });
      return { previous, post };
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
    const post = await prisma.$transaction(async (tx) => {
      await clearMediaUsage(tx, "BLOG_POST", id);
      return tx.blogPost.delete({ where: { id }, select: { slug: true } });
    });
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
