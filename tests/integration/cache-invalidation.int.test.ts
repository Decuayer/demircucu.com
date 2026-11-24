/**
 * Each mutation must expire exactly the cache tags documented in lib/cache/tags.ts. The expected
 * tags are written out here (not derived from tagsFor) so a change to the map is a visible,
 * reviewed change to this table.
 */
import { auth, cache } from "../helpers/action-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seed, SEED_ADMIN_ID, SEED_USER_ID } from "@/prisma/seed";
import { resetDatabase } from "../helpers/db";

const admin = await import("@/app/actions/admin");
const settings = await import("@/app/actions/settings");
const interactions = await import("@/app/actions/blog_interaction");
const contact = await import("@/app/actions/contact");

const project = {
  titleTr: "T",
  titleEn: "T",
  summaryTr: "S",
  summaryEn: "S",
};
const post = {
  titleTr: "T",
  titleEn: "T",
  excerptTr: "E",
  excerptEn: "E",
  contentTr: "<p>c</p>",
  contentEn: "<p>c</p>",
};
const experience = {
  company: "C",
  positionTr: "P",
  positionEn: "P",
  descriptionTr: "D",
  descriptionEn: "D",
  startDate: new Date("2024-01-01"),
};

const sampleProject = () => prisma.project.findUniqueOrThrow({ where: { slug: "sample-project" } });
const helloPost = () => prisma.blogPost.findUniqueOrThrow({ where: { slug: "hello-world" } });
const anExperience = () => prisma.experience.findFirstOrThrow();

function expiredTags(): string[] {
  return cache.updateTag.mock.calls.map(([tag]) => tag as string).sort();
}

interface Case {
  name: string;
  as?: "ADMIN" | "USER";
  run: () => Promise<{ error?: string } | object>;
  expected: () => Promise<string[]>;
}

const CASES: Case[] = [
  {
    name: "updateSiteSettings",
    run: () => settings.updateSiteSettings({ heroTitleEn: "New" }),
    expected: async () => ["settings"],
  },
  {
    name: "createProject",
    run: () => admin.createProject({ ...project, slug: "fresh" }),
    expected: async () => ["project:fresh", "projects"],
  },
  {
    name: "updateProject (slug change expires old and new slug)",
    run: async () =>
      admin.updateProject((await sampleProject()).id, { ...project, slug: "renamed" }),
    expected: async () => ["project:renamed", "project:sample-project", "projects"],
  },
  {
    name: "deleteProject",
    run: async () => admin.deleteProject((await sampleProject()).id),
    expected: async () => ["project:sample-project", "projects"],
  },
  {
    name: "createExperience",
    run: () => admin.createExperience(experience),
    expected: async () => {
      const created = await prisma.experience.findFirstOrThrow({ where: { company: "C" } });
      return [`experience:${created.id}`, "experiences"];
    },
  },
  {
    name: "updateExperience",
    run: async () => admin.updateExperience((await anExperience()).id, experience),
    expected: async () => [`experience:${(await anExperience()).id}`, "experiences"],
  },
  {
    name: "createBlogPost",
    run: () => admin.createBlogPost({ ...post, slug: "fresh-post" }),
    expected: async () => ["post:fresh-post", "posts"],
  },
  {
    name: "updateBlogPost",
    run: async () => admin.updateBlogPost((await helloPost()).id, { ...post, slug: "hello-world" }),
    expected: async () => [
      `post-interactions:${(await helloPost()).id}`,
      "post:hello-world",
      "posts",
    ],
  },
  {
    name: "setCommentHidden",
    run: async () =>
      admin.setCommentHidden({ id: (await prisma.comment.findFirstOrThrow()).id, hidden: true }),
    expected: async () => [`post-interactions:${(await helloPost()).id}`],
  },
  {
    name: "addComment (path derived on the server, not from the client)",
    as: "USER",
    run: async () => interactions.addComment({ postId: (await helloPost()).id, content: "Nice" }),
    expected: async () => [`post-interactions:${(await helloPost()).id}`],
  },
  {
    name: "toggleLike",
    as: "USER",
    run: async () => interactions.toggleLike({ postId: (await helloPost()).id }),
    expected: async () => [`post-interactions:${(await helloPost()).id}`],
  },
  {
    name: "submitContactMessage (no public cache affected)",
    run: () =>
      contact.submitContactMessage({
        name: "N",
        email: "n@example.test",
        message: "Hello there, long enough.",
      }),
    expected: async () => [],
  },
];

describe("cache invalidation map", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seed(prisma);
    cache.updateTag.mockClear();
  });

  it.each(CASES)("$name", async ({ run, expected, as = "ADMIN" }) => {
    auth.current = await prisma.profile.findUniqueOrThrow({
      where: { id: as === "ADMIN" ? SEED_ADMIN_ID : SEED_USER_ID },
    });
    const result = await run();
    expect(result).toMatchObject({ success: true });
    expect(expiredTags()).toEqual((await expected()).sort());
  });

  it("interactions refuse unpublished posts", async () => {
    auth.current = await prisma.profile.findUniqueOrThrow({ where: { id: SEED_USER_ID } });
    const draft = await prisma.blogPost.findUniqueOrThrow({ where: { slug: "draft-post" } });
    expect(await interactions.addComment({ postId: draft.id, content: "x" })).toEqual({
      error: "notFound",
    });
    expect(cache.updateTag).not.toHaveBeenCalled();
  });
});
