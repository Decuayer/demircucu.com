/**
 * Phase 8 migration (20261127090000_phase8_cv_location): a CV per language in site settings
 * (PDFs from the media library only) and an optional location per experience.
 */
import { auth } from "../helpers/action-mocks";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seed, SEED_ADMIN_ID } from "@/prisma/seed";
import { resetDatabase } from "../helpers/db";

const { updateSiteSettings } = await import("@/app/actions/settings");
const { createExperience, updateExperience } = await import("@/app/actions/admin");
const { getSiteSettings } = await import("@/lib/data/settings");
const { deleteMediaFile } = await import("@/app/actions/media");

async function media(path: string, type: string) {
  return prisma.mediaFile.create({ data: { name: path.split("/").pop()!, type, size: 1, path } });
}

beforeEach(async () => {
  await resetDatabase();
  await seed(prisma);
  auth.current = await prisma.profile.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } });
});

describe("CV in site settings", () => {
  it("stores a PDF per language and exposes public URLs", async () => {
    await media("settings/cv-tr.pdf", "application/pdf");
    await media("settings/cv-en.pdf", "application/pdf");
    expect(
      await updateSiteSettings({ cvPathTr: "settings/cv-tr.pdf", cvPathEn: "settings/cv-en.pdf" }),
    ).toEqual({ success: true });
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    const settings = await getSiteSettings();
    process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    expect(settings?.cvUrlTr).toBe(
      "https://project.supabase.co/storage/v1/object/public/media/settings/cv-tr.pdf",
    );
    expect(settings?.cvUrlEn).toBe(
      "https://project.supabase.co/storage/v1/object/public/media/settings/cv-en.pdf",
    );
  });

  it("rejects a non-PDF and an unknown path without saving", async () => {
    await media("settings/photo.png", "image/png");
    expect(await updateSiteSettings({ cvPathTr: "settings/photo.png" })).toEqual({
      error: "unsupportedType",
    });
    expect(await updateSiteSettings({ cvPathEn: "settings/missing.pdf" })).toEqual({
      error: "unsupportedType",
    });
    const row = await prisma.siteSettings.findUniqueOrThrow({ where: { id: "main" } });
    expect([row.cvPathTr, row.cvPathEn]).toEqual([null, null]);
  });

  it("clears the CV and keeps a CV file from being deleted while in use", async () => {
    const file = await media("settings/cv.pdf", "application/pdf");
    await updateSiteSettings({ cvPathTr: "settings/cv.pdf" });
    expect(await deleteMediaFile(file.id)).toMatchObject({ error: "mediaInUse" });
    await updateSiteSettings({ cvPathTr: "" });
    const row = await prisma.siteSettings.findUniqueOrThrow({ where: { id: "main" } });
    expect(row.cvPathTr).toBeNull();
  });
});

describe("experience location", () => {
  const input = {
    company: "Acme",
    positionTr: "Mühendis",
    positionEn: "Engineer",
    descriptionTr: "Açıklama",
    descriptionEn: "Description",
    startDate: new Date("2025-06-16"),
  };

  it("is optional and saved per language", async () => {
    const created = await createExperience(input);
    if (!created.success) throw new Error(JSON.stringify(created));
    const id = created.id;
    expect((await prisma.experience.findUniqueOrThrow({ where: { id } })).locationTr).toBeNull();

    await updateExperience(id, { ...input, locationTr: " İzmir, Türkiye ", locationEn: "Izmir" });
    const row = await prisma.experience.findUniqueOrThrow({ where: { id } });
    expect([row.locationTr, row.locationEn]).toEqual(["İzmir, Türkiye", "Izmir"]);

    await updateExperience(id, { ...input, locationTr: "", locationEn: "" });
    const cleared = await prisma.experience.findUniqueOrThrow({ where: { id } });
    expect([cleared.locationTr, cleared.locationEn]).toEqual([null, null]);
  });
});
