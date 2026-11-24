import { expect, test } from "@playwright/test";

/**
 * Cached components ("use cache") take the locale from the root param. Both languages must
 * render their own strings, also on the second (cached) request.
 */
const EXPECTED = {
  tr: { projects: "Projelerim", copyright: "Tüm hakları saklıdır.", quickLinks: "Hızlı Linkler" },
  en: { projects: "Projects", copyright: "All rights reserved.", quickLinks: "Fast Links" },
} as const;

for (const locale of ["tr", "en"] as const) {
  test(`${locale}: cached pages render ${locale} strings`, async ({ page }) => {
    for (let visit = 0; visit < 2; visit++) {
      await page.goto(`/${locale}/projects`);
      await expect(page.locator("h1")).toContainText(EXPECTED[locale].projects);
      const footer = page.locator("footer");
      await expect(footer).toContainText(EXPECTED[locale].copyright);
      await expect(footer).toContainText(EXPECTED[locale].quickLinks);
      await expect(footer).toContainText(String(new Date().getUTCFullYear()));
    }
  });
}

test("switching locale keeps the other language intact", async ({ page }) => {
  await page.goto("/en/projects");
  await page.goto("/tr/projects");
  await expect(page.locator("h1")).toContainText(EXPECTED.tr.projects);
  await page.goto("/en/projects");
  await expect(page.locator("h1")).toContainText(EXPECTED.en.projects);
});
