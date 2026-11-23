import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seed, SEED_ADMIN_ID } from "@/prisma/seed";
import { resetDatabase } from "../helpers/db";

describe("prisma seed", () => {
  beforeEach(resetDatabase);

  it("creates the expected baseline data", async () => {
    await seed(prisma);

    const admin = await prisma.profile.findUnique({ where: { id: SEED_ADMIN_ID } });
    expect(admin?.role).toBe("ADMIN");
    expect(await prisma.project.count({ where: { published: true } })).toBe(1);
    expect(await prisma.project.count({ where: { published: false } })).toBe(1);
    expect(await prisma.blogPost.count()).toBe(2);
    expect(await prisma.tag.count()).toBe(4);
  });

  it("is idempotent", async () => {
    await seed(prisma);
    const counts = async () => ({
      profiles: await prisma.profile.count(),
      tags: await prisma.tag.count(),
      projects: await prisma.project.count(),
      experiences: await prisma.experience.count(),
      posts: await prisma.blogPost.count(),
      comments: await prisma.comment.count(),
      likes: await prisma.like.count(),
    });
    const first = await counts();
    await seed(prisma);
    expect(await counts()).toEqual(first);
  });
});
