import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { adminClient, sql } from "./helpers/supabase";

/**
 * Phase 6: no broken images anywhere. Every page in the sitemap is scrolled to the bottom so lazy
 * images load; every visible <img> must decode, no image request may fail, and own media must be
 * served through the image optimizer (/_next/image) rather than as stored originals.
 */
test("no page in the sitemap has a broken or unoptimised image", async ({ page, request }) => {
  test.setTimeout(120_000);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  expect(paths.length).toBeGreaterThan(10);

  const failures: string[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "image" && response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()} on ${page.url()}`);
    }
  });

  for (const path of paths) {
    await page.goto(path, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    });
    await page.waitForLoadState("networkidle");
    const images = await page.locator("main img").evaluateAll((elements) =>
      (elements as HTMLImageElement[])
        .filter((img) => img.checkVisibility())
        .map((img) => ({
          src: img.currentSrc || img.src,
          ok: img.complete && img.naturalWidth > 0,
          sized: img.hasAttribute("width") || img.style.position === "absolute",
        })),
    );
    for (const image of images) {
      if (!image.ok) failures.push(`not decoded: ${image.src} on ${path}`);
      if (
        /\/storage\/v1\/object\/public\/media\//.test(image.src) &&
        !image.src.includes("/_next/image")
      ) {
        failures.push(`not optimised: ${image.src} on ${path}`);
      }
      if (!image.sized) failures.push(`no dimensions: ${image.src} on ${path}`);
    }
  }
  expect(failures).toEqual([]);
});

test("README images are served resized by the optimizer with their dimensions", async ({
  page,
}) => {
  const storage = adminClient().storage;
  const { error: bucketError } = await storage.createBucket("media", { public: true });
  if (bucketError && !/exists/i.test(bucketError.message)) throw bucketError;

  const stamp = randomUUID().slice(0, 8);
  const slug = `e2e-images-${stamp}`;
  const path = `github/e2e-${stamp}/shot.png`;
  const png = await sharp({
    create: { width: 1600, height: 800, channels: 3, background: "#7c3aed" },
  })
    .png()
    .toBuffer();
  const upload = await storage.from("media").upload(path, png, { contentType: "image/png" });
  if (upload.error) throw upload.error;
  const { data } = storage.from("media").getPublicUrl(path);

  const [media] = await sql<{ id: string }>(
    `INSERT INTO public."MediaFile" (id, name, type, size, path, source, "repoFullName", "contentHash", width, height)
     VALUES (gen_random_uuid()::text, 'shot.png', 'image/png', $1, $2, 'GITHUB', 'Decuayer/e2e', $3, 1600, 800)
     RETURNING id`,
    [png.length, path, `e2e-img-${stamp}`],
  );
  const [project] = await sql<{ id: string }>(
    `INSERT INTO public."Project" (id, slug, source, "githubFullName", "readmeHtml", "readmeVersion",
       published, "syncStatus", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'GITHUB', $2, $3, 1, true, 'OK', now())
     RETURNING id`,
    [
      slug,
      `Decuayer/e2e-images-${stamp}`,
      `<div class="markdown-body"><p><img src="${data.publicUrl}" alt="Screenshot"></p></div>`,
    ],
  );

  try {
    await page.goto(`/en/projects/${slug}`);
    const image = page.locator(".markdown-body img[alt=Screenshot]");
    await expect(image).toHaveAttribute("width", "1600");
    await expect(image).toHaveAttribute("height", "800");
    await expect(image).toHaveAttribute("loading", "lazy");
    await expect(image).toHaveAttribute("srcset", /\/_next\/image\?url=.*640w/);
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
      .toBeGreaterThan(0);
    // A phone-sized viewport gets a resized AVIF/WebP, not the 1600 px PNG.
    const src = await image.evaluate((img: HTMLImageElement) => img.currentSrc);
    const response = await page.request.get(src, { headers: { accept: "image/avif,image/webp" } });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/image\/(avif|webp)/);
  } finally {
    await sql(`DELETE FROM public."Project" WHERE id = $1`, [project!.id]);
    await sql(`DELETE FROM public."MediaFile" WHERE id = $1`, [media!.id]);
    await storage.from("media").remove([path]);
  }
});
