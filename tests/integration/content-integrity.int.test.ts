/**
 * Phase 3 integrity guarantees: media references (foreign keys + MediaUsage), tag join tables
 * and the tag tree / alias triggers.
 */
import { auth } from "../helpers/action-mocks";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { seed, SEED_ADMIN_ID } from "@/prisma/seed";
import { resetDatabase } from "../helpers/db";
import { deleteFileFromStorage } from "@/lib/supabase/storage";

const admin = await import("@/app/actions/admin");
const settings = await import("@/app/actions/settings");
const media = await import("@/app/actions/media");

const SUPABASE = "https://abc.supabase.co";
const publicUrl = (path: string) => `${SUPABASE}/storage/v1/object/public/media/${path}`;

const projectInput = {
  titleTr: "Medya",
  titleEn: "Media",
  slug: "media-project",
  summaryTr: "Özet",
  summaryEn: "Summary",
};

const addMedia = (path: string) =>
  prisma.mediaFile.create({ data: { name: path, type: "image/png", size: 1, path } });

beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE);
  await resetDatabase();
  await seed(prisma);
  auth.current = await prisma.profile.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } });
  vi.mocked(deleteFileFromStorage).mockClear();
});

describe("media references", () => {
  it("stores the logo path and records attachment and rich-text usage", async () => {
    await addMedia("projects/logo.png");
    await addMedia("projects/doc.pdf");
    await addMedia("projects/inline.png");
    const result = await admin.createProject({
      ...projectInput,
      logoPath: "projects/logo.png",
      descriptionEn: `<p>x</p><img src="${publicUrl("projects/inline.png")}" alt="">`,
      filesList: [
        { name: "Doc", path: "projects/doc.pdf" },
        { name: "Link", url: "https://example.com/a.pdf" },
      ],
    });
    expect(result.success).toBe(true);
    const project = await prisma.project.findUniqueOrThrow({ where: { slug: "media-project" } });
    expect(project.logoPath).toBe("projects/logo.png");
    expect(project.files).toEqual([
      { name: "Doc", path: "projects/doc.pdf" },
      { name: "Link", url: "https://example.com/a.pdf" },
    ]);
    const usages = await prisma.mediaUsage.findMany({
      where: { entityType: "PROJECT", entityId: project.id },
      select: { field: true, mediaFile: { select: { path: true } } },
      orderBy: { field: "asc" },
    });
    expect(usages).toEqual([
      { field: "description", mediaFile: { path: "projects/inline.png" } },
      { field: "files", mediaFile: { path: "projects/doc.pdf" } },
    ]);
  });

  it("rejects a logo or attachment path that is not in the media library", async () => {
    expect(
      await admin.createProject({ ...projectInput, logoPath: "projects/missing.png" }),
    ).toEqual({
      error: "invalidInput",
    });
    expect(
      await admin.createProject({
        ...projectInput,
        filesList: [{ name: "Doc", path: "projects/missing.pdf" }],
      }),
    ).toEqual({ error: "invalidInput" });
    expect(await prisma.project.count({ where: { slug: "media-project" } })).toBe(0);
  });

  it("rejects malformed paths and non-https external links", async () => {
    for (const input of [
      { logoPath: "../etc/passwd" },
      { logoPath: "https://evil.example/x.png" },
      { filesList: [{ name: "x", url: "javascript:alert(1)" }] },
      { filesList: [{ name: "x", path: "a/b.pdf", url: "https://example.com" }] },
    ]) {
      expect(await admin.createProject({ ...projectInput, ...input })).toMatchObject({
        error: "invalidInput",
      });
    }
  });

  it("refuses to delete media that content still uses, and keeps the storage object", async () => {
    const logo = await addMedia("projects/logo.png");
    const doc = await addMedia("projects/doc.pdf");
    const photo = await addMedia("settings/photo.png");
    await admin.createProject({
      ...projectInput,
      logoPath: logo.path,
      filesList: [{ name: "Doc", path: doc.path }],
    });
    await settings.updateSiteSettings({ aboutPhotoPath: photo.path });

    for (const file of [logo, doc, photo]) {
      expect(await media.deleteMediaFile(file.id)).toEqual({ error: "mediaInUse" });
    }
    expect(deleteFileFromStorage).not.toHaveBeenCalled();
    expect(await prisma.mediaFile.count()).toBe(3);
  });

  it("deletes unused media, and rolls the row back if storage fails", async () => {
    const file = await addMedia("general/unused.png");
    vi.mocked(deleteFileFromStorage).mockResolvedValueOnce({
      success: false,
      error: "storageUnavailable",
    });
    expect(await media.deleteMediaFile(file.id)).toEqual({ error: "serverError" });
    expect(await prisma.mediaFile.count({ where: { id: file.id } })).toBe(1);

    expect(await media.deleteMediaFile(file.id)).toEqual({ success: true });
    expect(await prisma.mediaFile.count({ where: { id: file.id } })).toBe(0);
  });

  it("frees media when the content is changed or deleted", async () => {
    const doc = await addMedia("projects/doc.pdf");
    const created = await admin.createProject({
      ...projectInput,
      filesList: [{ name: "Doc", path: doc.path }],
    });
    if (!created.success) throw new Error("create failed");
    await admin.updateProject(created.id, { ...projectInput, filesList: [] });
    expect(await prisma.mediaUsage.count()).toBe(0);

    await admin.updateProject(created.id, {
      ...projectInput,
      filesList: [{ name: "Doc", path: doc.path }],
    });
    expect(await prisma.mediaUsage.count()).toBe(1);
    await admin.deleteProject(created.id);
    expect(await prisma.mediaUsage.count()).toBe(0);
    expect(await media.deleteMediaFile(doc.id)).toEqual({ success: true });
  });
});

describe("tag join tables", () => {
  it("replaces manual tags but keeps tags attached by the GitHub sync", async () => {
    const project = await prisma.project.findUniqueOrThrow({ where: { slug: "sample-project" } });
    const python = await prisma.tag.findUniqueOrThrow({ where: { slug: "python" } });
    await prisma.projectTag.create({
      data: { projectId: project.id, tagId: python.id, source: "GITHUB" },
    });

    const result = await admin.updateProject(project.id, {
      ...projectInput,
      slug: "sample-project",
      tagsList: [{ nameTr: "Python", nameEn: "Python", slug: "python" }],
    });
    expect(result).toEqual({ success: true });
    const rows = await prisma.projectTag.findMany({
      where: { projectId: project.id },
      select: { source: true, tag: { select: { slug: true } } },
    });
    // typescript and nextjs (manual) are removed; python stays a single GITHUB row.
    expect(rows).toEqual([{ source: "GITHUB", tag: { slug: "python" } }]);
  });

  it("leaves tags untouched when the form sends no tag list", async () => {
    const project = await prisma.project.findUniqueOrThrow({ where: { slug: "sample-project" } });
    await admin.updateProject(project.id, { ...projectInput, slug: "sample-project" });
    expect(await prisma.projectTag.count({ where: { projectId: project.id } })).toBe(2);
  });

  it("does not let a tag in use be deleted, and cascades when the content is deleted", async () => {
    const python = await prisma.tag.findUniqueOrThrow({ where: { slug: "python" } });
    await expect(prisma.tag.delete({ where: { id: python.id } })).rejects.toMatchObject({
      code: "P2003",
    });
    const draft = await prisma.project.findUniqueOrThrow({ where: { slug: "draft-project" } });
    await admin.deleteProject(draft.id);
    expect(await prisma.projectTag.count({ where: { projectId: draft.id } })).toBe(0);
  });
});

describe("tag tree and alias triggers", () => {
  const slugId = async (slug: string) =>
    (await prisma.tag.findUniqueOrThrow({ where: { slug } })).id;

  it("rejects a tag that is its own parent or ancestor", async () => {
    const web = await slugId("web");
    const nextjs = await slugId("nextjs");
    await expect(
      prisma.tag.update({ where: { id: web }, data: { parentId: web } }),
    ).rejects.toThrow(/tag tree cycle/);
    await expect(
      prisma.tag.update({ where: { id: web }, data: { parentId: nextjs } }),
    ).rejects.toThrow(/tag tree cycle/);
    // A valid move still works.
    const ai = await slugId("ai");
    await prisma.tag.update({ where: { id: nextjs }, data: { parentId: ai } });
  });

  it("keeps aliases unique and distinct from every slug", async () => {
    const python = await slugId("python");
    await expect(
      prisma.tagAlias.create({ data: { alias: "next-js", tagId: python } }),
    ).rejects.toMatchObject({ code: "P2002" });
    await expect(
      prisma.tagAlias.create({ data: { alias: "typescript", tagId: python } }),
    ).rejects.toThrow(/equals a tag slug/);
    await expect(prisma.tag.create({ data: { slug: "next.js", name: "Next" } })).rejects.toThrow(
      /already an alias/,
    );
    await prisma.tagAlias.create({ data: { alias: "py", tagId: python } });
  });
});
