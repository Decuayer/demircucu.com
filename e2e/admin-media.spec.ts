import { deflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { ADMIN, adminClient, clearRateLimits, sql } from "./helpers/supabase";

/**
 * Phase 3 media flow end to end: the admin uploads a logo, the project stores its storage path
 * (not a URL), the public page renders the image from the derived URL, and the media library
 * refuses to delete the file while the project uses it.
 */

/** Smallest valid 1x1 PNG, generated so no binary fixture is committed. */
function onePixelPng(): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.from([0, 0x7c, 0x3a, 0xed, 0xff]))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test("uploaded logo is stored as a path, rendered publicly and protected from deletion", async ({
  page,
}) => {
  const storage = adminClient().storage;
  const { error } = await storage.createBucket("media", { public: true });
  if (error && !/exists/i.test(error.message)) throw error;

  await clearRateLimits();
  // Own project: other specs edit sample-project in parallel and would overwrite the logo.
  const slug = `e2e-media-${Date.now()}`;
  const [project] = await sql<{ id: string }>(
    `INSERT INTO public."Project" (id, slug, "titleTr", "titleEn", "summaryTr", "summaryEn", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'Medya testi', 'Media test', 'Özet', 'Summary', now())
     RETURNING id`,
    [slug],
  );
  let uploadedPath: string | undefined;

  await page.goto("/tr/auth/login?next=%2Ftr%2Fadmin");
  await page.locator("main").getByLabel("E-posta").fill(ADMIN.email);
  await page.locator("main").getByLabel("Şifre").fill(ADMIN.password);
  await page.locator("main").getByRole("button", { name: "Giriş Yap" }).click();
  await expect(page).toHaveURL(/\/tr\/admin$/);

  try {
    await page.goto(`/tr/admin/projects/${project!.id}/edit`);
    // Wait for hydration: a change event on the server-rendered input would be lost.
    await page.waitForLoadState("networkidle");
    const upload = page.waitForResponse((r) => r.url().endsWith("/api/upload"));
    await page
      .locator('input[type=file][accept="image/*"]')
      .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: onePixelPng() });
    expect((await upload).status()).toBe(200);
    await expect(page.getByRole("img", { name: "Yüklenen görselin önizlemesi" })).toBeVisible();
    await page.locator("form button[type=submit]").click();
    await expect(page).toHaveURL(/\/tr\/admin\/projects$/);

    const [row] = await sql<{ logoPath: string | null }>(
      `SELECT "logoPath" FROM public."Project" WHERE id = $1`,
      [project!.id],
    );
    uploadedPath = row?.logoPath ?? undefined;
    expect(uploadedPath).toMatch(/^projects\/[0-9a-f-]{36}\.png$/);

    await expect
      .poll(
        async () => {
          await page.goto(`/tr/projects/${slug}`);
          return page
            .locator(`main img[src$="${uploadedPath}"]`)
            .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)
            .catch(() => false);
        },
        { timeout: 15_000, intervals: [250, 500, 1000] },
      )
      .toBe(true);

    await page.goto("/tr/admin/media");
    await page.getByTitle("logo.png").first().click();
    await page.getByRole("button", { name: /Dosyayı Sil|Delete File/ }).click();
    await page.getByRole("alertdialog").getByRole("button").last().click();
    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toHaveAttribute("data-type", "error");
    expect(
      await sql(`SELECT 1 FROM public."MediaFile" WHERE path = $1`, [uploadedPath]),
    ).toHaveLength(1);
  } finally {
    await sql(`DELETE FROM public."Project" WHERE id = $1`, [project!.id]);
    if (uploadedPath) {
      await sql(`DELETE FROM public."MediaFile" WHERE path = $1`, [uploadedPath]);
      await storage.from("media").remove([uploadedPath]);
    }
  }
});
