"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { invalidate } from "@/lib/cache/tags";
import { findPublishedPost } from "@/lib/data/interactions";
import { consumeAll, RATE_LIMITS } from "@/lib/rate-limit";
import { fail, ok, toActionFailure, type ActionResult } from "@/lib/actions/result";
import { commentSchema, likeSchema } from "@/lib/validation/interactions";
import type { z } from "zod";

/**
 * The cache entries to refresh are derived on the server from the post id; the client cannot
 * choose what gets revalidated (security review S8).
 */
export async function addComment(input: z.input<typeof commentSchema>): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const { postId, content } = commentSchema.parse(input);
    const limit = await consumeAll([
      [RATE_LIMITS.commentPerUser, user.id],
      [RATE_LIMITS.commentPerUserDaily, user.id],
    ]);
    if (!limit.allowed) return fail("rateLimited");

    const post = await findPublishedPost(postId);
    if (!post) return fail("notFound");

    await prisma.comment.create({ data: { content, postId: post.id, authorId: user.id } });
    invalidate({ entity: "postInteractions", postId: post.id });
    return ok();
  } catch (error) {
    return toActionFailure(error, "addComment");
  }
}

export async function toggleLike(
  input: z.input<typeof likeSchema>,
): Promise<ActionResult<{ liked: boolean }>> {
  try {
    const user = await requireUser();
    const { postId } = likeSchema.parse(input);
    const limit = await consumeAll([[RATE_LIMITS.likePerUser, user.id]]);
    if (!limit.allowed) return fail("rateLimited");

    const post = await findPublishedPost(postId);
    if (!post) return fail("notFound");

    const where = { postId_userId: { postId: post.id, userId: user.id } };
    const existing = await prisma.like.findUnique({ where, select: { id: true } });
    if (existing) {
      await prisma.like.delete({ where });
    } else {
      // A concurrent duplicate hits the unique constraint and maps to `conflict`.
      await prisma.like.create({ data: { postId: post.id, userId: user.id } });
    }
    invalidate({ entity: "postInteractions", postId: post.id });
    return ok({ liked: !existing });
  } catch (error) {
    return toActionFailure(error, "toggleLike");
  }
}
