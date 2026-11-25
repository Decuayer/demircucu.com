/**
 * Authorization matrix for privileged server actions and admin data reads.
 * Every admin mutation is listed once and exercised as anonymous, USER and ADMIN.
 * New privileged actions must be added to `ADMIN_ACTIONS`.
 */
import { auth } from "../helpers/action-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seed, SEED_ADMIN_ID, SEED_USER_ID } from "@/prisma/seed";
import { resetDatabase } from "../helpers/db";

const admin = await import("@/app/actions/admin");
const settings = await import("@/app/actions/settings");
const media = await import("@/app/actions/media");
const tags = await import("@/app/actions/tags");
const adminData = await import("@/lib/data/admin");

type Role = "anonymous" | "USER" | "ADMIN";

interface ActionCase {
  name: string;
  /** Optional fixture setup that runs before the state snapshot. */
  prepare?: () => Promise<void>;
  /** Runs the action; may throw or return `{ error }` when rejected. */
  run: () => Promise<unknown>;
  /** Returns a snapshot of the state the action would change. */
  state: () => Promise<unknown>;
}

const projectInput = {
  titleTr: "Yeni",
  titleEn: "New",
  slug: "authz-new-project",
  summaryTr: "Özet",
  summaryEn: "Summary",
};

const experienceInput = {
  company: "X",
  positionTr: "X",
  positionEn: "X",
  descriptionTr: "X",
  descriptionEn: "X",
  startDate: new Date("2024-01-01"),
};

const postInput = {
  titleTr: "X",
  titleEn: "X",
  slug: "authz-post",
  excerptTr: "X",
  excerptEn: "X",
  contentTr: "<p>X</p>",
  contentEn: "<p>X</p>",
};

const sampleProject = () => prisma.project.findUniqueOrThrow({ where: { slug: "sample-project" } });
const tagId = async (slug: string) => (await prisma.tag.findUniqueOrThrow({ where: { slug } })).id;
const helloPost = () => prisma.blogPost.findUniqueOrThrow({ where: { slug: "hello-world" } });

const ADMIN_ACTIONS: ActionCase[] = [
  {
    name: "createProject",
    run: () => admin.createProject(projectInput),
    state: () => prisma.project.count(),
  },
  {
    name: "updateProject",
    run: async () =>
      admin.updateProject((await sampleProject()).id, {
        ...projectInput,
        slug: "sample-project",
        titleEn: "Hacked",
      }),
    state: () => prisma.project.findUnique({ where: { slug: "sample-project" } }),
  },
  {
    name: "deleteProject",
    run: async () => admin.deleteProject((await sampleProject()).id),
    state: () => prisma.project.count(),
  },
  {
    name: "createExperience",
    run: () => admin.createExperience(experienceInput),
    state: () => prisma.experience.count(),
  },
  {
    name: "updateExperience",
    run: async () =>
      admin.updateExperience((await prisma.experience.findFirstOrThrow()).id, {
        ...experienceInput,
        company: "Hacked",
      }),
    state: () => prisma.experience.findFirst(),
  },
  {
    name: "deleteExperience",
    run: async () => admin.deleteExperience((await prisma.experience.findFirstOrThrow()).id),
    state: () => prisma.experience.count(),
  },
  {
    name: "createBlogPost",
    run: () => admin.createBlogPost(postInput),
    state: () => prisma.blogPost.count(),
  },
  {
    name: "updateBlogPost",
    run: async () =>
      admin.updateBlogPost((await helloPost()).id, { ...postInput, slug: "hello-world" }),
    state: () => prisma.blogPost.findUnique({ where: { slug: "hello-world" } }),
  },
  {
    name: "deleteBlogPost",
    run: async () => admin.deleteBlogPost((await helloPost()).id),
    state: () => prisma.blogPost.count(),
  },
  {
    name: "setCommentHidden",
    run: async () =>
      admin.setCommentHidden({ id: (await prisma.comment.findFirstOrThrow()).id, hidden: true }),
    state: () => prisma.comment.findFirst(),
  },
  {
    name: "deleteComment",
    run: async () => admin.deleteComment((await prisma.comment.findFirstOrThrow()).id),
    state: () => prisma.comment.count(),
  },
  {
    name: "deleteContactMessage",
    prepare: async () => {
      await prisma.contactMessage.create({
        data: { name: "a", email: "a@example.test", message: "m" },
      });
    },
    run: async () =>
      admin.deleteContactMessage((await prisma.contactMessage.findFirstOrThrow()).id),
    state: () => prisma.contactMessage.count(),
  },
  {
    name: "updateSiteSettings",
    run: () => settings.updateSiteSettings({ heroTitleEn: "Hacked" }),
    state: () => prisma.siteSettings.findUnique({ where: { id: "main" } }),
  },
  {
    name: "deleteMediaFile",
    prepare: async () => {
      await prisma.mediaFile.create({
        data: {
          name: "x.png",
          type: "image/png",
          size: 1,
          path: "general/x.png",
        },
      });
    },
    run: async () => media.deleteMediaFile((await prisma.mediaFile.findFirstOrThrow()).id),
    state: () => prisma.mediaFile.count(),
  },
  {
    name: "createTag",
    run: () => tags.createTag({ name: "Rust" }),
    state: () => prisma.tag.count(),
  },
  {
    name: "updateTag",
    run: async () => tags.updateTag(await tagId("python"), { name: "Hacked" }),
    state: () => prisma.tag.findUnique({ where: { slug: "python" } }),
  },
  {
    name: "reorderTag",
    run: async () => tags.reorderTag(await tagId("nextjs"), "down"),
    state: () =>
      prisma.tag.findMany({ select: { slug: true, order: true }, orderBy: { slug: "asc" } }),
  },
  {
    name: "addTagAlias",
    run: async () => tags.addTagAlias(await tagId("python"), "py"),
    state: () => prisma.tagAlias.count(),
  },
  {
    name: "removeTagAlias",
    run: () => tags.removeTagAlias("next-js"),
    state: () => prisma.tagAlias.count(),
  },
  {
    name: "mergeTag",
    run: async () => tags.mergeTag(await tagId("typescript"), await tagId("nextjs")),
    state: () => prisma.tag.count(),
  },
  {
    name: "deleteTag",
    prepare: async () => {
      await prisma.tag.create({ data: { slug: "unused", name: "Unused" } });
    },
    run: async () => tags.deleteTag(await tagId("unused")),
    state: () => prisma.tag.count(),
  },
];

/** Admin reads must reject non-admins too (drafts and messages are private). */
const ADMIN_READS: { name: string; run: () => Promise<unknown> }[] = [
  { name: "adminListProjects", run: () => adminData.adminListProjects() },
  {
    name: "adminGetProject",
    run: async () => adminData.adminGetProject((await sampleProject()).id),
  },
  { name: "adminListExperiences", run: () => adminData.adminListExperiences() },
  { name: "adminListPosts", run: () => adminData.adminListPosts() },
  { name: "adminGetPost", run: async () => adminData.adminGetPost((await helloPost()).id) },
  { name: "adminListContactMessages", run: () => adminData.adminListContactMessages() },
  { name: "adminListMediaFiles", run: () => adminData.adminListMediaFiles() },
  { name: "adminListComments", run: () => adminData.adminListComments() },
  { name: "adminGetSiteSettings", run: () => adminData.adminGetSiteSettings() },
  { name: "adminListTags", run: () => adminData.adminListTags() },
  { name: "adminListTagOptions", run: () => adminData.adminListTagOptions() },
];

async function setRole(role: Role): Promise<void> {
  if (role === "anonymous") {
    auth.current = null;
    return;
  }
  const id = role === "ADMIN" ? SEED_ADMIN_ID : SEED_USER_ID;
  auth.current = await prisma.profile.findUniqueOrThrow({ where: { id } });
}

async function runSafely(run: () => Promise<unknown>): Promise<unknown> {
  try {
    return await run();
  } catch (error) {
    return { error };
  }
}

function isRejected(result: unknown): boolean {
  return typeof result === "object" && result !== null && "error" in result;
}

describe("authorization matrix: admin actions", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seed(prisma);
  });

  describe.each(["anonymous", "USER"] as const)("as %s", (role) => {
    it.each(ADMIN_ACTIONS)("$name is rejected without side effects", async (action) => {
      await action.prepare?.();
      await setRole(role);
      const before = await action.state();
      const result = await runSafely(action.run);
      expect(isRejected(result)).toBe(true);
      expect(await action.state()).toEqual(before);
    });

    it.each(ADMIN_READS)("$name is rejected", async (read) => {
      await setRole(role);
      await expect(read.run()).rejects.toThrow(/Authentication required|Insufficient permissions/);
    });
  });

  describe("as ADMIN", () => {
    it.each(ADMIN_ACTIONS)("$name succeeds and changes state", async (action) => {
      await action.prepare?.();
      await setRole("ADMIN");
      const before = await action.state();
      const result = await runSafely(action.run);
      expect(isRejected(result)).toBe(false);
      expect(await action.state()).not.toEqual(before);
    });

    it.each(ADMIN_READS)("$name succeeds", async (read) => {
      await setRole("ADMIN");
      await expect(read.run()).resolves.toBeDefined();
    });
  });
});

describe("error responses", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seed(prisma);
  });

  it("lists library images only for admins", async () => {
    await setRole("anonymous");
    expect(await media.listLibraryImages()).toEqual({ error: "unauthenticated" });
    await setRole("USER");
    expect(await media.listLibraryImages()).toEqual({ error: "forbidden" });
    await setRole("ADMIN");
    expect(await media.listLibraryImages()).toMatchObject({ success: true, images: [] });
  });

  it("returns codes, never internal messages", async () => {
    await setRole("USER");
    expect(await admin.deleteProject("whatever")).toEqual({ error: "forbidden" });
    await setRole("anonymous");
    expect(await admin.deleteProject("whatever")).toEqual({ error: "unauthenticated" });
    await setRole("ADMIN");
    expect(await admin.deleteProject("does-not-exist")).toEqual({ error: "notFound" });
    expect(await admin.createProject({ ...projectInput, slug: "sample-project" })).toEqual({
      error: "conflict",
    });
  });

  it("rejects mass assignment of unknown settings columns", async () => {
    await setRole("ADMIN");
    const result = await settings.updateSiteSettings({
      heroTitleEn: "ok",
      id: "other",
      updatedAt: new Date(0),
    } as never);
    expect(result).toMatchObject({ error: "invalidInput" });
    expect(await prisma.siteSettings.count()).toBe(1);
  });

  it("sanitizes rich text on save", async () => {
    await setRole("ADMIN");
    await admin.createBlogPost({
      ...postInput,
      contentTr: '<p>ok</p><script>alert(1)</script><img src="x" onerror="alert(1)">',
    });
    const post = await prisma.blogPost.findUniqueOrThrow({ where: { slug: "authz-post" } });
    expect(post.contentTr).toBe('<p>ok</p><img src="x">');
  });
});

describe("content tags", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seed(prisma);
    await setRole("ADMIN");
  });

  it("sets the manual tags by id and rejects unknown ids", async () => {
    const project = await sampleProject();
    const result = await admin.updateProject(project.id, {
      ...projectInput,
      slug: "sample-project",
      tagIds: [await tagId("nextjs"), await tagId("python")],
    });
    expect(result).toEqual({ success: true });
    const rows = await prisma.projectTag.findMany({
      where: { projectId: project.id },
      select: { source: true, tag: { select: { slug: true } } },
      orderBy: { tag: { slug: "asc" } },
    });
    expect(rows).toEqual([
      { source: "MANUAL", tag: { slug: "nextjs" } },
      { source: "MANUAL", tag: { slug: "python" } },
    ]);
    expect(
      await admin.updateProject(project.id, {
        ...projectInput,
        slug: "sample-project",
        tagIds: ["does-not-exist"],
      }),
    ).toEqual({ error: "invalidInput" });
  });
});
