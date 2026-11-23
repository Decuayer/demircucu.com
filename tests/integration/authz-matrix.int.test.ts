/**
 * Authorization matrix for privileged server actions.
 * Every admin mutation is listed once and exercised as anonymous, USER and ADMIN.
 * New privileged actions must be added to `ADMIN_ACTIONS`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { seed, SEED_ADMIN_ID, SEED_USER_ID } from "@/prisma/seed";
import { resetDatabase } from "../helpers/db";

const auth = vi.hoisted(() => ({ current: null as Profile | null }));

vi.mock("@/app/actions/auth", () => ({
  getCurrentUser: vi.fn(async () => auth.current),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));
vi.mock("@/lib/supabase/storage", () => ({
  BUCKET_NAME: "media",
  deleteFileFromStorage: vi.fn(async () => ({ success: true })),
  uploadFileToStorage: vi.fn(),
}));

const admin = await import("@/app/actions/admin");
const settings = await import("@/app/actions/settings");
const media = await import("@/app/actions/media");

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

const ADMIN_ACTIONS: ActionCase[] = [
  {
    name: "createProject",
    run: () => admin.createProject(projectInput),
    state: () => prisma.project.count(),
  },
  {
    name: "updateProject",
    run: async () => {
      const p = await prisma.project.findUniqueOrThrow({ where: { slug: "sample-project" } });
      return admin.updateProject(p.id, { titleEn: "Hacked" });
    },
    state: () => prisma.project.findUnique({ where: { slug: "sample-project" } }),
  },
  {
    name: "deleteProject",
    run: async () => {
      const p = await prisma.project.findUniqueOrThrow({ where: { slug: "sample-project" } });
      return admin.deleteProject(p.id);
    },
    state: () => prisma.project.count(),
  },
  {
    name: "createExperience",
    run: () =>
      admin.createExperience({
        company: "X",
        positionTr: "X",
        positionEn: "X",
        descriptionTr: "X",
        descriptionEn: "X",
        startDate: new Date("2024-01-01"),
      }),
    state: () => prisma.experience.count(),
  },
  {
    name: "deleteExperience",
    run: async () => {
      const e = await prisma.experience.findFirstOrThrow();
      return admin.deleteExperience(e.id);
    },
    state: () => prisma.experience.count(),
  },
  {
    name: "createBlogPost",
    run: () =>
      admin.createBlogPost({
        titleTr: "X",
        titleEn: "X",
        slug: "authz-post",
        excerptTr: "X",
        excerptEn: "X",
        contentTr: "X",
        contentEn: "X",
      }),
    state: () => prisma.blogPost.count(),
  },
  {
    name: "deleteBlogPost",
    run: async () => {
      const p = await prisma.blogPost.findUniqueOrThrow({ where: { slug: "hello-world" } });
      return admin.deleteBlogPost(p.id);
    },
    state: () => prisma.blogPost.count(),
  },
  {
    name: "deleteContactMessage",
    prepare: async () => {
      await prisma.contactMessage.create({
        data: { name: "a", email: "a@example.test", message: "m" },
      });
    },
    run: async () => {
      const m = await prisma.contactMessage.findFirstOrThrow();
      return admin.deleteContactMessage(m.id);
    },
    state: () => prisma.contactMessage.count(),
  },
  {
    name: "updateSiteSettings",
    run: () => settings.updateSiteSettings({ heroTitleEn: "Hacked" }),
    state: () => prisma.siteSettings.findUnique({ where: { id: "main" } }),
  },
  {
    name: "saveMediaFileToDB",
    run: () =>
      media.saveMediaFileToDB({
        name: "x.png",
        url: "https://example.test/x.png",
        type: "image/png",
        size: 1,
        bucket: "media",
        path: "x.png",
      }),
    state: () => prisma.mediaFile.count(),
  },
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
  });
});
