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
 * a real 404. Either way the page must not be indexable. Known trade-off, docs/security-review.md.
 */
for (const path of [
  "/tr/projects/does-not-exist",
  "/en/blog/does-not-exist",
  "/tr/experience/nope",
]) {
  test(`unknown slug ${path} is a (soft) 404`, async ({ page }) => {
    const response = await page.goto(path);
    if (response?.status() !== 404) {
      expect(response?.status()).toBe(200);
      await expect(page.locator('meta[name="robots"][content="noindex"]')).toHaveCount(1);
    }
    await expect(page.locator("body")).toContainText(/404|bulunamadı|could not be found/i);
  });
}
