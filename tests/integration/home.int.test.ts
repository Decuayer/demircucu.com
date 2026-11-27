/**
 * Home page data (phase 8): featured projects with covers, newest posts, recent experience,
 * featured skills with the usage fallback, and the admin fields that drive them.
 */
import { auth } from "../helpers/action-mocks";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seed, SEED_ADMIN_ID } from "@/prisma/seed";
import { resetDatabase } from "../helpers/db";

const { getHomeExperiences, getHomePosts, getHomeProjects, getHomeSkills } =
  await import("@/lib/data/home");
const { updateSiteSettings } = await import("@/app/actions/settings");
const { updateTag } = await import("@/app/actions/tags");

const SUPABASE = "https://project.supabase.co";
const storage = (path: string) => `${SUPABASE}/storage/v1/object/public/media/${path}`;
let previousUrl: string | undefined;

beforeAll(() => {
  previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE;
});
afterAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
});

beforeEach(async () => {
  await resetDatabase();
  await seed(prisma);
  auth.current = await prisma.profile.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } });
});

async function project(slug: string, data: Record<string, unknown> = {}) {
  return prisma.project.create({
    data: {
      slug,
      titleTr: slug,
      titleEn: slug,
      summaryTr: "Özet",
      summaryEn: "Summary",
      published: true,
      featured: true,
      ...data,
    },
  });
}

const media = (path: string, width: number, height: number) =>
  prisma.mediaFile.create({
    data: { name: path, type: "image/png", size: 1, path, width, height, blurDataUrl: "data:x" },
  });

describe("getHomeProjects", () => {
  it("lists only featured, published projects, at most four, with covers", async () => {
    await prisma.project.updateMany({ data: { featured: false } });
    await media("projects/shot.png", 1600, 900);
    await media("github/r/logo.png", 256, 256);
    await project("admin-cover", { order: 1, logoPath: "projects/shot.png" });
    await project("readme-cover", {
      order: 2,
      readmeHtml: `<img class="readme-badge" src="https://img.shields.io/x"><img src="${storage("github/r/logo.png")}">`,
    });
    await project("no-cover", { order: 3 });
    await project("fourth", { order: 4 });
    await project("fifth", { order: 5 });
    await project("draft", { order: 0, published: false });
    await project("not-featured", { order: 0, featured: false });

    const rows = await getHomeProjects();
    expect(rows.map((row) => row.slug)).toEqual([
      "admin-cover",
      "readme-cover",
      "no-cover",
      "fourth",
    ]);
    expect(rows[0]!.cover).toMatchObject({
      source: "admin",
      fit: "cover",
      url: storage("projects/shot.png"),
    });
    expect(rows[1]!.cover).toMatchObject({ source: "readme", fit: "contain" });
    expect(rows[2]!.cover).toBeNull();
    expect(rows[0]).not.toHaveProperty("readmeHtml");
  });
});

describe("getHomePosts", () => {
  it("returns the three newest published posts without their full content", async () => {
    await prisma.blogPost.deleteMany();
    const author = SEED_ADMIN_ID;
    for (const [slug, day, published] of [
      ["old", "2025-01-01", true],
      ["mid", "2025-06-01", true],
      ["new", "2025-12-01", true],
      ["newest-draft", "2026-01-01", false],
      ["newer", "2025-11-01", true],
    ] as const) {
      await prisma.blogPost.create({
        data: {
          slug,
          titleTr: slug,
          titleEn: slug,
          excerptTr: "e",
          excerptEn: "e",
          contentTr: `<p>${"kelime ".repeat(450)}</p>`,
          contentEn: "<p>short</p>",
          published,
          authorId: author,
          createdAt: new Date(day),
        },
      });
    }
    const posts = await getHomePosts();
    expect(posts.map((post) => post.slug)).toEqual(["new", "newer", "mid"]);
    expect(posts[0]).toMatchObject({ minutesTr: 3, minutesEn: 1 });
    expect(posts[0]).not.toHaveProperty("contentTr");
  });
});

describe("getHomeExperiences", () => {
  it("returns the latest three with their length in calendar months", async () => {
    await prisma.experience.deleteMany();
    for (const [company, start, end] of [
      ["A", "2020-01-01", "2020-07-01"],
      ["B", "2025-06-16", "2025-07-11"],
      ["C", "2024-01-01", "2025-01-01"],
      ["D", "2023-01-01", "2023-02-01"],
    ] as const) {
      await prisma.experience.create({
        data: {
          company,
          positionTr: "p",
          positionEn: "p",
          descriptionTr: "d",
          descriptionEn: "d",
          startDate: new Date(start),
          endDate: new Date(end),
        },
      });
    }
    const rows = await getHomeExperiences();
    expect(rows.map((row) => [row.company, row.months])).toEqual([
      // Calendar months with both ends included (decision 1a).
      ["B", 2],
      ["C", 13],
      ["D", 2],
    ]);
  });
});

describe("getHomeSkills", () => {
  it("falls back to the most used skills, then follows the admin's featured choice", async () => {
    const fallback = await getHomeSkills();
    expect(fallback.source).toBe("usage");
    expect(fallback.skills.length).toBeLessThanOrEqual(12);

    const python = await prisma.tag.findUniqueOrThrow({ where: { slug: "python" } });
    expect(await updateTag(python.id, { featured: true })).toEqual({ success: true });
    const featured = await getHomeSkills();
    expect(featured).toEqual({
      source: "featured",
      skills: [expect.objectContaining({ slug: "python" })],
    });

    // A hidden or non-skill tag is never featured on the home page.
    await prisma.tag.update({ where: { id: python.id }, data: { hidden: true } });
    expect((await getHomeSkills()).source).toBe("usage");
  });
});

describe("hero intro", () => {
  it("is saved per language and limited in length", async () => {
    expect(await updateSiteSettings({ heroIntroTr: " Merhaba. ", heroIntroEn: "Hello." })).toEqual({
      success: true,
    });
    const row = await prisma.siteSettings.findUniqueOrThrow({ where: { id: "main" } });
    expect([row.heroIntroTr, row.heroIntroEn]).toEqual(["Merhaba.", "Hello."]);
    expect(await updateSiteSettings({ heroIntroTr: "x".repeat(601) })).toMatchObject({
      error: "invalidInput",
    });
  });
});
