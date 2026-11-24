import { expect, test } from "@playwright/test";

const PUBLIC_PATHS = ["/", "/about", "/experience", "/projects", "/blog", "/contact"];
const LOCALES = ["tr", "en"] as const;

for (const locale of LOCALES) {
  for (const path of PUBLIC_PATHS) {
    test(`${locale}${path} renders without errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      const response = await page.goto(`/${locale}${path === "/" ? "" : path}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("main")).toBeVisible();
      expect(consoleErrors).toEqual([]);
    });
  }
}

for (const [browserLocale, expected] of [
  ["tr-TR", "tr"],
  ["en-US", "en"],
] as const) {
  test.describe(`browser language ${browserLocale}`, () => {
    test.use({ locale: browserLocale });

    test(`root redirects to /${expected}`, async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(new RegExp(`/${expected}/?$`));
    });
  });
}

/**
 * With Partial Prefetching the first request for an unlisted slug is answered from the route's
 * fallback shell, so the status is already 200 when notFound() runs: Next.js marks the page
 * noindex and renders the not-found UI (soft 404). Once that result is cached, later requests get
 * a real 404. Either way the page must not be indexable. Accepted trade-off (Phase 2 decision),
 * docs/security-review.md. A fresh slug per run makes the first request really the first one.
 */
const run = Date.now().toString(36);
const unknownPaths = [
  `/tr/projects/does-not-exist-${run}`,
  `/en/blog/does-not-exist-${run}`,
  `/tr/experience/nope-${run}`,
];
for (const path of unknownPaths) {
  test(`unknown slug ${path.replace(run, "<run>")} is never indexable`, async ({ page }) => {
    for (const attempt of ["first", "second"]) {
      const response = await page.goto(path);
      expect([200, 404], `${attempt} request status`).toContain(response?.status());
      expect(
        await page.locator('meta[name="robots"][content*="noindex"]').count(),
        `${attempt} request noindex`,
      ).toBeGreaterThan(0);
      await expect(page.locator("body")).toContainText(/404|bulunamadı|could not be found/i);
    }
  });
}

test("unknown slugs never reach the sitemap", async ({ request }) => {
  for (const path of unknownPaths) await request.get(path);
  const sitemap = await request.get("/sitemap.xml");
  // No sitemap yet (SEO phase); once it exists it must list published content only.
  if (sitemap.status() === 404) return;
  expect(sitemap.status()).toBe(200);
  const body = await sitemap.text();
  for (const path of unknownPaths) expect(body).not.toContain(path.split("/").pop()!);
});
